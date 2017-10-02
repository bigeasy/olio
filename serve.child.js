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
    var Operation = require('operation/variadic')

    var Destructible = require('destructible')
    var destructible = new Destructible(3000, 'olio.serve')

    var Descendent = require('descendent')
    var descendent = new Descendent(program)

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.addDestructor('descendent', descendent, 'destroy')

    var Server = require('./server')
    var server = new Server(program, program.argv, descendent)

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        var message
        program.on('message', message = Operation([ server, 'send' ]))
        destructible.addDestructor('message', function () {
            program.removeListener('message', message)
        })

        destructible.addDestructor('server', server, 'destroy')

        server.listen(destructible.monitor('children'))

        server.run(program.ultimate.workers, function (index) {
            var env = JSON.parse(JSON.stringify(program.env))
            env.OLIO_WORKER_INDEX = index
            return env
        })
    }, function () {
        destructible.completed.wait(async())
    })
}))
