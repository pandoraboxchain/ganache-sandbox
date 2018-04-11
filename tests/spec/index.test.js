'use strict';

const path = require('path');
const { expect } = require('chai');
const {
    providers: {
        WebsocketProvider
    } } = require('web3');
const GanacheNode = require('../../src');

describe('Ganache sandbox tests:', () => {

    const contractsPath = path.join(__dirname, '../../');
    const extract = ['MetaCoin', 'ConvertLib'];
    const node = new GanacheNode({ path: contractsPath, extract });
    let server;

    before(async () => {
        server = await node.server;
    });

    after(done => server.close(done));

    it('Should be a constructor', () => {
        expect(GanacheNode).to.be.a('function');
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

    it('#publisher should be an instanceof Promise', () => {
        expect(node.publisher).to.be.an.instanceOf(Promise);
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
