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

let ganachePort = 1111;
let ganacheServers = {};

class GanacheNode extends EventEmitter {

    _asyncGetter(prop) {
        return new Promise((resolve, reject) => {
            let self = this;
            const timeout = setTimeout(() => {
                reject(new Error(`Cannot get "${prop}". Timeout exceeded`));
            }, this._timeout);

            function onError(err) {
                clearTimeout(timeout);
                self.removeListener('initialized', onInitialized);
                reject(err);
            }

            function onInitialized() {
                clearTimeout(timeout);
                self.removeListener('error', onError);
                resolve(self[prop]);
            }

            if (this._isInitializing) {

                this.once('error', onError);
                this.once('initialized', onInitialized);
                return;
            }

            onInitialized();
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

    get accounts() {
        return this._asyncGetter('_accounts');
    }

    get publisher() {
        return this._asyncGetter('_publisher');
    }

    constructor(options = {}) {
        super();
        this._basePath = options.path || path.join(__dirname, '.');
        this._copyPaths = options.copy || [];
        this._extract = options.extract || [];
        this._logServer = options.log || false;
        this._timeout = options.timeout || 7000;
        this._maxServers = options.maxServers || 10;
        this._debug = options.debug || false;
        this._port = ganachePort++;
        this._networkName = Web3.utils.randomHex(4);// own network for each instance
        this._config = {};
        this._server = {};
        this._provider = {};
        this._contracts = {};
        this._addresses = {};
        this._web3 = {};
        this._accounts = [];
        this._publisher = '';
        this._isInitializing = true;

        if (Object.keys(ganacheServers).length > this._maxServers) {

            throw new Error(`Defined maximum number of servers "${this._maxServers}" is exceeded`);
        }

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

        setTimeout(() => {

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
        }, this._maxServers * 1500);        
    }

    async _init() {

        // Create contracts sandbox
        const tempDir = path.join(this._basePath, 'contracts-sandbox', this._networkName);
        await fs.copy(path.join(this._basePath, 'truffle.js'), path.join(tempDir, 'truffle.js'));
        await fs.copy(path.join(this._basePath, 'truffle-config.js'), path.join(tempDir, 'truffle-config.js'));
        await fs.copy(path.join(this._basePath, 'contracts'), path.join(tempDir, 'contracts'));
        await fs.copy(path.join(this._basePath, 'migrations'), path.join(tempDir, 'migrations'));

        // Copy additional paths to the sadndbox
        let copies = this._copyPaths.map(p => fs.copy(path.join(this._basePath, p), path.join(tempDir, p)));
        await Promise.all(copies);

        // Create truffle config related to sandbox
        this._config = Config.load(path.join(tempDir, 'truffle.js'), {
            reset: true
        });
        this._config.network = this._networkName;

        // Create ganache network
        await this._createNetwork({
            'total_accounts': 10,
            defaultBalanceEther: 1000000,
            seed: this._networkName,
            gasLimit: this._config.gas,
            allowUnlimitedContractSize: true,
            locked: false,
            debug: this._debug,
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
        this._accounts = accounts;
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
            
            ganacheServers[this._networkName] = {
                server: this._server,
                closed: false
            };

            const onError = err => this._server.close(() => {

                if (this._logServer) {

                    debug(`Server has been closed due to error: ${err}`);
                }
            });

            this.once('error', onError);
            
            this._server.listen(this._port, err => {
                this.removeListener('error', onError);

                if (err) {

                    return reject(err);
                }

                // due to the current version of WebsocketProvider provider where this method is missed 
                // this issue will be fixed in the future releases of web3
                // https://github.com/ethereum/web3.js/issues/1119
                Web3.providers.WebsocketProvider.prototype.sendAsync = Web3.providers.WebsocketProvider.prototype.send;

                this._provider = new Web3.providers.WebsocketProvider(`ws://0.0.0.0:${this._port}`);                
                this._provider.isMetaMask = true;                                
                this._provider.on('error', reject);

                // web3 setup
                this._web3 = new Web3(this._provider);

                if (this._provider.connection.readyState !== this._provider.connection.OPEN) {
                    const timeout = setTimeout(() => reject(new Error('Connection timeout exceeded')), 7000);

                    this._provider.on('connect', () => this._extractPublisherAddress()
                        .then(() => {
                            clearTimeout(timeout);
                            resolve(this);
                        })
                        .catch(reject));
                } else {

                    resolve(this);
                }
            });
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
                    log: text => {
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
