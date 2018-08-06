#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: olio <socket> [command] <args>

        --help              display this message
    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var Olio = require('..')
    var cadence = require('cadence')
    var Caller = require('conduit/caller')
    var Reactor = require('reactor')

    var Destructible = require('destructible')
    var destructible = new Destructible(900, './bin/http.bin.js')
    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('olio.http')
    var Shuttle = require('prolific.shuttle')
    var shuttle = Shuttle.shuttle(program, logger)
    destructible.destruct.wait(shuttle, 'close')

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        destructible.monitor('olio', Olio, program, function (constructor) {
            constructor.sender('echo', cadence(function (async, destructible) {
                destructible.monitor('caller', Caller, async())
            }))
        }, async())
    }, function (olio) {
        var reactor = new Reactor({
            echo: cadence(function (async, request, index) {
                async(function () {
                    olio.sender('echo', +index).invoke({
                        url: request.url,
                        body: request.body
                    }, async())
                }, function (response) {
                    return response
                })
            }),
            index: cadence(function (async) {
                return 'Hello, World!\n'
            })
        }, function (dispatcher) {
            dispatcher.dispatch('GET /', 'index')
            dispatcher.dispatch('POST /worker/:id/echo', 'echo')
            dispatcher.logger = function (entry) {
                console.log(entry)
            }
        })
        var http = require('http')
        var cluster = require('cluster')
        var delta = require('delta')
        var server = http.createServer(reactor.middleware)
        async(function () {
            destructible.destruct.wait(server, 'close')
            server.listen(8080, async())
        }, function () {
            delta(destructible.monitor('http')).ee(server).on('close')
        })
    }, function () {
        logger.info('started', { http: true })
        destructible.completed.wait(async())
    })
}))
