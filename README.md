[![Codacy Badge](https://api.codacy.com/project/badge/Grade/df0fd54e410d4f78b7f28ff33ac505a0)](https://www.codacy.com/app/kostysh/ganache-sandbox?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=pandoraboxchain/ganache-sandbox&amp;utm_campaign=Badge_Grade) [![Codacy Badge](https://api.codacy.com/project/badge/Coverage/3ab75785e85744d6854c9f92c7c98d45)](https://www.codacy.com/app/kostysh/ganache-sandbox?utm_source=github.com&utm_medium=referral&utm_content=pandoraboxchain/ganache-sandbox&utm_campaign=Badge_Coverage) [![Build Status](https://travis-ci.org/pandoraboxchain/ganache-sandbox.svg?branch=master)](https://travis-ci.org/pandoraboxchain/ganache-sandbox)  

# ganache-sandbox
Utility for creating a sandbox with contracts for testing purposes 

## Installing
```sh
npm i --save ganache-sandbox@https://github.com/pandoraboxchain/ganache-sandbox.git#v0.1.0
```

## Usage
```javascript
const GanacheNode = require('ganache-sandbox');
const contractsPath = '<full-path-to-contracts-dir>';

// Names of contracts which addresses you want to extract 
// during deployment process from migrations logs
const extract = ['MetaCoin', 'ConvertLib'];

const runner = async () => {

    const node = new GanacheNode({ path: contractsPath, extract });
    const server = await node.server;
    const provider = await node.provider;
    const contracts = await node.contracts;
    const addresses = await node.addresses;
    const publisher = await node.publisher;

    return {
        node,
        server,// Ganache server
        provider,// Web3 WebsocketProvider instance
        contracts,// Built contracts
        addresses,
        publisher
    };
};

runner()
    .then(sandbox => {
        console.log('Contracts:', Object.keys(sandbox));
        console.log('Extracted addresses:', addresses);
        console.log('Publisher address (from):', publisher);

        // ... doing tests

        // We need close all servers to finish tests gracefully
        sandbox.server.close(() => {
            console.log('All done!');
        });
    })
    .catch(console.error);
```
You can instantiate as much sandboxes as you need.

## Testing
Docker is required to running tests
```sh
npm test
npm run test-with-coverage
```