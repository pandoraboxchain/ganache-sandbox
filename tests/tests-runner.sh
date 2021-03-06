#!/bin/sh

if [ "$WITH_COVERAGE" -eq 0 ]; then 
    echo "Running tests without coverage"
    npx mocha --require @babel/register -R spec --timeout 70000 ./tests/spec/**/*.test.js

else 
    echo "Running tests with coverage"
    npx istanbul cover _mocha --report lcovonly -- --require @babel/register -R spec --timeout 70000 ./tests/spec/**/*.test.js
    cat ./coverage/lcov.info | npx codacy-coverage --token 3ab75785e85744d6854c9f92c7c98d45
fi
