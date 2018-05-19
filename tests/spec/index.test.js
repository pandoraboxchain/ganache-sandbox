'use strict';

const path = require('path');
const { expect } = require('chai');
const Web3 = require('web3');
const { providers: { WebsocketProvider } } = Web3;
const GanacheNode = require('../../src');

describe('Ganache sandbox tests:', () => {

    const contractsPath = path.join(__dirname, '../../');
    const copy = [
        'node_modules/openzeppelin-solidity'
    ];
    const extract = ['MetaCoin', 'ConvertLib'];
    const node = new GanacheNode({ path: contractsPath, copy, extract });
    let server;

    before(async () => {
        server = await node.server;
    });

    after(done => server.close(done));

    it('GanacheNode should be a function', () => {
        expect(GanacheNode).to.be.a('function');
    });

    it('#server.close should be a function', () => {
        expect(server.close).to.be.a('function');
    });

    it('#server should be an instanceof Promise', () => {
        expect(node.server).to.be.an.instanceOf(Promise);
    });

    it('#provider should be an instanceof Promise', () => {
        expect(node.provider).to.be.an.instanceOf(Promise);
    });

    it('#contracts should be an instanceof Promise', () => {
        expect(node.contracts).to.be.an.instanceOf(Promise);
    });

    it('#addresses should be an instanceof Promise', () => {
        expect(node.addresses).to.be.an.an.instanceOf(Promise);
    });

    it('#web3 should be an instanceof Promise', () => {
        expect(node.web3).to.be.an.an.instanceOf(Promise);
    });

    it('#web3 should be resolved to the instanceof Web3', async () => {
        const web3 = await node.web3;
        expect(web3).to.be.an.an.instanceOf(Web3);
    });

    it('#publisher should be an instanceof Promise', () => {
        expect(node.publisher).to.be.an.instanceOf(Promise);
    });

    it('#network should be a string', () => {
        expect(node.network).to.be.a('string');
    });

    it('#contracts should be resolved to the object with appropriate contracts', async () => {
        const contracts = await node.contracts;
        expect(contracts).to.have.property('MetaCoin');
        expect(contracts).to.have.property('ConvertLib');
        expect(contracts).to.have.property('Migrations');
    });

    it('#provider should be resolved to the instance of WebsocketProvider', async () => {
        const provider = await node.provider;
        expect(provider).to.be.an.instanceOf(WebsocketProvider);
    });

    it('#addresses should be resolved to the object of appropriate addresses', async () => {
        const addresses = await node.addresses;
        expect(addresses).to.have.property('MetaCoin');
        expect(addresses).to.have.property('ConvertLib');
    });

    it('#publisher should be resolved to an etherium address', async () => {
        const publisher = await node.publisher;
        expect(publisher).to.be.a('string');
        expect(publisher).to.satisfy(address => {
            return new RegExp('^0x[a-fA-F0-9]{40}$').test(address);
        }, 'match to ethereum address regexp');
    });
});
