#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: olio <socket> [command] <args>

        --help              display this message
    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var path = require('path')
    var argv = program.argv.slice()
    var socket = argv.shift()
    var command = argv.shift()
    var arguable = require(path.join(__dirname, command + '.bin.js'))
    arguable(argv, {
        stdout: program.stdout,
        env: program.env,
        stdin: program.stdin,
        stderr: program.stderr,
        events: program,
        send: program.send,
        properties: { socket: socket }
    }, async())
}))
