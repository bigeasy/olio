#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: olio <socket> [command] <args>

        --help              display this message
    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var Responder = require('conduit/responder')

    var Destructible = require('destructible')
    var destructible = new Destructible('./bin/echo.bin.js')
    var cadence = require('cadence')

    program.on('shutdown', destructible.destroy.bind(destructible))

    var Olio = require('..')
    var olio = new Olio(program, function (constructor) {
        constructor.receiver = function () {
            return new Responder({
                request: cadence(function (async, envelope) {
                    console.log(envelope)
                    return [ 1 ]
                })
            })
        }
    })
    console.log('----  -----')

    destructible.addDestructor('olio', olio, 'destroy')

    olio.listen(async())
}))
