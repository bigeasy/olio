#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help              display this message
        --name    <string>  name of service
        --workers <string>  socket

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var Destructible = require('destructible')
    var destructible = new Destructible(3000, 'olio.serve')

    var Descendent = require('descendent')
    var descendent = new Descendent(program)

    program.on('shutdown', destructible.destroy.bind(destructible))

    destructible.destruct.wait(descendent, 'destroy')

    var Server = require('./server')
    var server = new Server(program, program.ultimate.name, program.argv, descendent)

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        destructible.destruct.wait(server, 'destroy')

        server.listen(destructible.monitor('children'))

        server.run(program.ultimate.workers, function (index) {
            var env = JSON.parse(JSON.stringify(program.env))
            env.OLIO_WORKER_INDEX = index
            return env
        })
    }, function () {
        program.ready.unlatch()
        destructible.completed.wait(async())
    })
}))
