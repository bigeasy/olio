#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help              display this message
        --workers <string>  socket

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var UserAgent = require('vizsla')
    var ua = new UserAgent
    var fs = require('fs')
    var rescue = require('rescue')
    var assert = require('assert')
    async(function () {
        fs.stat(program.socket, async())
    }, function (stat) {
        // TODO Some nice throw an error thing here.
        assert(stat.isSocket(), 'is not a socket')
        async(function () {
            ua.fetch({
                socketPath: program.socket
            }, {
                url: '/run',
                post: {
                    parameters: program.ultimate,
                    argv: program.argv
                }
            }, async())
        }, function (body, response) {
            console.log('>>>', body)
        })
    })
}))
