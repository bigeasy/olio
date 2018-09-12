#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: olio <socket> [command] <args>

        --help              display this message
    ___ . ___
 */
require('arguable')(module, function (program, callback) {
    var Procedure = require('conduit/procedure')

    var Destructible = require('destructible')
    var destructible = new Destructible('./t/run.bin.js')
    var cadence = require('cadence')

    var logger = require('prolific.logger').createLogger('olio.echo')
    var shuttle = require('foremost')('prolific.shuttle')
    shuttle.start(logger)

    program.on('shutdown', destructible.destroy.bind(destructible))
    destructible.destruct.wait(shuttle, 'close')

    var Olio = require('..')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('olio', Olio, program, cadence(function (async, destructible) {
                async(function () {
                    destructible.monitor('procedure', Procedure, cadence(function (async, envelope) {
                        console.log(envelope)
                        return [ 1 ]
                    }), async())
                }, function (procedure) {
                    // TODO Figure out how to tier your shutdowns for Node.js 6.
                    destructible.destruct.wait(procedure.outbox, 'end')
                    procedure.eos.wait(procedure.outbox, 'end')
                    return procedure
                })
            }), async())
        }, function (olio) {
            logger.info('started', { hello: 'world', pid: program.pid })
        })
    })(destructible.monitor('initialize', true))
})
