#!/bin/bash

function start () {
    docker-compose down
    rm -rf node_modules    
    # remove data
    rm -rf ./.data

    #package install
    yarn install
    yarn codegen
    yarn build

    #start container
    docker-compose up
}

start
