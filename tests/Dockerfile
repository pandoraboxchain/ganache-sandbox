FROM node:10

LABEL maintainer="kostysh@gmail.com"

ARG WITH_COVERAGE=0
ENV WITH_COVERAGE=$WITH_COVERAGE

RUN mkdir /ganache-sandbox
COPY ./package.json /ganache-sandbox/package.json

# Installing of dependencies
WORKDIR /ganache-sandbox
RUN npm i --silent && npm i \ 
        @babel/cli \
        @babel/core \
        @babel/plugin-proposal-object-rest-spread \
        @babel/plugin-syntax-object-rest-spread \
        @babel/polyfill \
        @babel/preset-env \
        @babel/register \
        openzeppelin-solidity \
        mocha \
        mocha-lcov-reporter \
        chai \
        istanbul@1.1.0-alpha.1 \
        codacy-coverage --silent

# Copy tests sources
WORKDIR /

COPY ./src /ganache-sandbox/src
COPY ./tests/contracts /ganache-sandbox/contracts
COPY ./tests/migrations /ganache-sandbox/migrations
COPY ./tests/spec /ganache-sandbox/tests/spec
COPY ./tests/truffle.js /ganache-sandbox/truffle.js
COPY ./tests/truffle-config.js /ganache-sandbox/truffle-config.js
COPY ./tests/.babelrc /ganache-sandbox/.babelrc
COPY ./.git /ganache-sandbox/.git
COPY ./tests/tests-runner.sh /ganache-sandbox/tests-runner.sh

WORKDIR /ganache-sandbox
CMD [ "/ganache-sandbox/tests-runner.sh" ]
