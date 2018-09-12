#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: olio <socket> [command] <args>

        --help              display this message
    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var Procedure = require('conduit/procedure')

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, './bin/echo.bin.js')
    var cadence = require('cadence')

    var logger = require('prolific.logger').createLogger('olio.echo')
    var shuttle = require('foremost')('prolific.shuttle')
    shuttle.start(logger)

    program.on('shutdown', destructible.destroy.bind(destructible))
    destructible.destruct.wait(shuttle, 'close')

    var Olio = require('..')

    async(function () {
        destructible.monitor('olio', Olio, program, cadence(function (async, destructible) {
            async(function () {
                destructible.monitor('procedure', Procedure, cadence(function (async, envelope) {
                    console.log(envelope)
                    return [ 1 ]
                }), async())
            }, function (procedure) {
                procedure.eos.wait(procedure.outbox, 'end')
                return procedure
            })
        }), async())
    }, function (olio) {
        logger.info('started', { hello: 'world', pid: program.pid })
    })
}))
