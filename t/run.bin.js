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
    var Shuttle = require('prolific.shuttle')
    var shuttle = Shuttle.shuttle(program, logger)

    program.on('shutdown', destructible.destroy.bind(destructible))
    destructible.destruct.wait(shuttle, 'close')

    var Olio = require('..')
    var olio = new Olio(program, function (constructor) {
        constructor.receiver = function (destructible, argv, callback) {
            destructible.monitor('procedure', Procedure, cadence(function (async, envelope) {
                console.log(envelope)
                return [ 1 ]
            }), callback)
        }
    })

    destructible.destruct.wait(olio, 'destroy')

    olio.listen(async())

    logger.info('started', { hello: 'world', pid: program.pid })
}))
