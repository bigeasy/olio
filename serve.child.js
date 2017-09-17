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
    var Server = require('./server')
    var server = new Server(program.argv)
    var Destructible = require('destructible')
    var destructible = new Destructible('olio.serve')

    var Operation = require('operation/variadic')

    program.on('shutdown', destructible.destroy.bind(destructible))
    destructible.addDestructor('server', server, 'destroy')

    var message
    program.on('message', message = Operation([ server, 'send' ]))
    destructible.addDestructor('message', function () {
        program.removeListener('message', message)
    })

    server.listen(destructible.monitor('children'))

    server.run(program.ultimate.workers, function (index) {
        var env = JSON.parse(JSON.stringify(program.env))
        env.OLIO_WORKER_INDEX = index
        return env
    })

    destructible.completed(3000, async())
}))
