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
require('arguable')(module, function (program, callback) {
    var Destructible = require('destructible')
    // TODO Make this configurable, default to parent less 250 milliseconds.
    var destructible = new Destructible(3000, 'olio.serve')

    var descendent = require('foremost')('descendent')
    descendent.increment()

    program.on('shutdown', destructible.destroy.bind(destructible))

    var Server = require('./server')

   destructible.completed.wait(callback)
   destructible.completed.wait(descendent, 'decrement')

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('server', Server, program, program.ultimate.name, program.argv, descendent, async())
        }, function (server) {
            server.run(program.ultimate.workers, function (index) {
                var env = JSON.parse(JSON.stringify(program.env))
                // TODO Unnecessary because of cookies.
                env.OLIO_WORKER_INDEX = index
                return env
            })
        }, function () {
            program.ready.unlatch()
        })
    })(destructible.monitor('initialize', true))
})
