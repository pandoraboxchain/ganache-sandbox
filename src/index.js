'use strict';
/**
 * Ganache sandbox
 * Utility for creating a sandbox with contracts for testing purposes
 * 
 * @file index.js
 * @author Kostiantyn Smyrnov <kostysh@gmail.com>
 * @date 2018
 */

const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 0;// disable MaxListenersExceededWarning
const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('ganache');
const Web3 = require('web3');
const Config = require('truffle-config');
const Contracts = require('truffle-workflow-compile');
const Migrate = require('truffle-migrate');
const ganache = require('ganache-cli');

let ganachePort = 8545;
let ganacheServers = {};

class GanacheNode extends EventEmitter {

    _asyncGetter(prop) {
        return new Promise((resolve, reject) => {

            if (!this._isInitializing) {

                return resolve(this[prop]);
            }

            this.once('error', err => reject(err));
            this.once('initialized', () => resolve(this[prop]));
        });
    }

    get network() {
        return this._networkName;
    }

    get server() {
        return this._asyncGetter('_server');
    }

    get provider() {
        return this._asyncGetter('_provider');
    }

    get contracts() {
        return this._asyncGetter('_contracts');
    }

    get addresses() {
        return this._asyncGetter('_addresses');
    }

    get web3() {
        return this._asyncGetter('_web3');
    }

    get publisher() {
        return this._asyncGetter('_publisher');
    }

    constructor(options = {}) {
        super();
        this._basePath = options.path || path.join(__dirname, '.');
        this._extract = options.extract || [];
        this._logServer = options.log || false;
        this._port = ganachePort++;
        this._networkName = Web3.utils.randomHex(4);// own network for each instance
        this._config = {};
        this._server = {};
        this._provider = {};
        this._contracts = {};
        this._addresses = {};
        this._web3 = {};
        this._publisher = '';
        this._isInitializing = true;

        this._init()
            .then(() => {
                this._isInitializing = false;
                this.emit('initialized', this);
            })
            .catch(err => {
                this._isInitializing = false;
                this.emit('error', err);
            });
    }

    close(callback = () => {}) {

        try {

            ganacheServers[this._networkName].closed = true;
            let totalClose = true;

            for (let key of Object.keys(ganacheServers)) {

                if (ganacheServers[key] && !ganacheServers[key].closed) {

                    totalClose = false;
                    break;
                }
            }

            if (totalClose) {

                // we have to close server after all tests have been finished only
                // so send a close event after all close methods have been called
                for (let key of Object.keys(ganacheServers)) {

                    ganacheServers[key].server.close();
                }
            }

            callback();
        } catch(err) {
            callback(err);
        }
    }

    async _init() {

        // Create contracts sandbox
        const tempDir = path.join(this._basePath, 'contracts-sandbox', this._networkName);
        await fs.copy(path.join(this._basePath, 'truffle.js'), path.join(tempDir, 'truffle.js'));
        await fs.copy(path.join(this._basePath, 'truffle-config.js'), path.join(tempDir, 'truffle-config.js'));
        await fs.copy(path.join(this._basePath, 'contracts'), path.join(tempDir, 'contracts'));
        await fs.copy(path.join(this._basePath, 'migrations'), path.join(tempDir, 'migrations'));
        await fs.copy(path.join(this._basePath, 'node_modules', 'zeppelin-solidity'), path.join(tempDir, 'node_modules', 'zeppelin-solidity'));
        
        // Create truffle config related to sandbox
        this._config = Config.load(path.join(tempDir, 'truffle.js'), {
            reset: true
        });
        this._config.network = this._networkName;

        // Create ganache network
        await this._createNetwork({
            seed: this._networkName,
            gasLimit: this._config.gas,
            locked: false,
            logger: {
                log: this._logServer ? text => debug(`ServerLog: ${text}`) : () => {}
            },
            ws: true
        });

        // Compile contracts
        await this._compile();

        // Deploy contracts to the network
        await this._migrate();

        return this;
    }

    async _extractPublisherAddress() {

        const accounts = await this._web3.eth.getAccounts();
        this._publisher = accounts[0];
        const networkId = await this._web3.eth.net.getId();
        this._config.networks[this._networkName] = {
            provider: this._provider,
            network_id: networkId + '',
            from: this._publisher
        };

        return this;
    }

    _createNetwork(networkConfig) {
        return new Promise((resolve, reject) => {
            this._server = ganache.server(networkConfig);
            this.once('error', err => this._server.close(() => {

                if (this._logServer) {

                    debug(`Servers has been closed due to error: ${err}`);
                }
            }));            
            this._server.listen(this._port, err => {

                if (err) {

                    return reject(err);
                }

                this._provider = new Web3.providers.WebsocketProvider(`ws://localhost:${this._port}`);                
                this._provider.isMetaMask = true;
                
                // due to the current version of WebsocketProvider provider where this method is missed 
                // this issue will be fixed in the future releases of web3
                if (typeof this._provider.sendAsync !== 'function') {

                    this._provider.sendAsync = this._provider.send;
                }                

                this._web3 = new Web3(this._provider);
                this._extractPublisherAddress()
                    .then(resolve)
                    .catch(reject);
            });
            
            ganacheServers[this._networkName] = {
                server: this._server,
                closed: false
            };
        });
    }

    _compile() {
        return new Promise((resolve, reject) => {
            
            this._contracts = {};

            Contracts.compile(this._config.with({
                all: true
            }), (err, contracts) => {
                        
                if (err) {
        
                    return reject(err);
                }

                this._contracts = contracts;        
                resolve();
            });    
        });
    }

    _migrate() {
        return new Promise((resolve, reject) => {
            
            this._addresses = {};

            Migrate.run(this._config.with({
                logger: {
                    log: (text, addresses) => {
                        text = String(text).trim();

                        this._extract.forEach(name => {
                           
                            if (new RegExp(`${name}:`).test(text)) {
                        
                                let keyVal = text.split(':');
                                this._addresses[keyVal[0].trim()] = keyVal[1].trim();
                            }
                        });
                    }
                }
            }), err => {
        
                if (err) {
        
                    return reject(err);
                }
        
                resolve();
            });    
        });
    }
}

module.exports = GanacheNode;
