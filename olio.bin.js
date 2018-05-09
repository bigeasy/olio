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
    // TODO This is almost an `exec`, pass in `ready`?
    var child = arguable(argv, {
        stdout: program.stdout,
        env: program.env,
        stdin: program.stdin,
        stderr: program.stderr,
        events: program,
        send: program.send,
        attributes: { socket: socket, prefix: program.attribute.prefix }
    }, async())
    child.ready.wait(program.ready, 'unlatch')
}), { prefix: [] })
