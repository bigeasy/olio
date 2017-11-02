#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help              display this message
        --socket <string>   socket

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

    var Descendent = require('descendent')
    var logger = require('prolific.logger').createLogger('olio')

    var Destructible = require('destructible')
    var destructible = new Destructible(5000, 'olio/listen.bin')
    program.on('shutdown', destructible.destroy.bind(destructible))

    var Shuttle = require('prolific.shuttle')
    var shuttle = Shuttle.shuttle(program, logger)
    destructible.addDestructor('shuttle', shuttle, 'close')

    logger.info('y', {})

    destructible.completed.wait(async())

    var children = program.argv.map(JSON.parse.bind(JSON))

    async([function () {
        destructible.destroy()
    }], function () {
        var Listener = require('./listener.js')

        var descendent = new Descendent(process)
        destructible.addDestructor('descendent', descendent, 'destroy')

        var listener = new Listener(descendent, program.socket)

        destructible.addDestructor('listener', listener, 'destroy')
        listener.listen(destructible.monitor([ 'listener' ]))

        var downgrader = new Downgrader
        downgrader.on('socket', Operation([ listener, 'socket' ]))

        var server = http.createServer(listener.reactor.middleware)
        server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

        destructible.addDestructor('listen', server, 'close')

        async(function () {
            server.listen(program.socket, async())
        }, function () {
            delta(destructible.monitor([ 'server' ])).ee(server).on('close')
            listener.children(children)
            program.ready.unlatch()
        })
    }, function () {
        destructible.completed.wait(async())
    }, function () {
        console.log('xxxxxxx')
        logger.info('x', {})
    })
}))
