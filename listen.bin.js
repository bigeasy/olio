#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help              display this message
        --socket <string>   socket
        --workers <string>  socket

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    // Convert an HTTP request into a raw socket.
    var Downgrader = require('downgrader')

    // Contextualized callbacks and event handlers.
    var Operation = require('operation/variadic')

    var http = require('http')
    var delta = require('delta')

    var Destructible = require('destructible')
    var destructible = new Destructible('olio/listen.bin')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var Listener = require('./listener.js')
    var listener = new Listener(program.socket, program.prefix)

    listener.listen(destructible.monitor([ 'listener' ]))
    destructible.addDestructor('listener', listener, 'destroy')

    var downgrader = new Downgrader
    downgrader.on('socket', Operation([ listener, 'socket' ]))

    var server = http.createServer(listener.reactor.middleware)
    server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

    destructible.addDestructor('listen', server, 'close')

    async(function () {
        server.listen(program.socket, async())
    }, function () {
        program.ready.unlatch()
        delta(destructible.monitor([ 'server' ])).ee(server).on('close')
        destructible.completed(5000, async())
    })
}))
