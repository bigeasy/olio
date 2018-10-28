#!/usr/bin/env node

/*
    ___ usage ___ en_US ___
    usage: olio <socket> [command] <args>

        -p, --port  <integer>   port to bind to

        --help                  display this message
    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    var Olio = require('..')
    var cadence = require('cadence')
    var Caller = require('conduit/caller')
    var Reactor = require('reactor')

    var Destructible = require('destructible')
    var destructible = new Destructible(250, './bin/http.bin.js')
    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('olio.http')
    var shuttle = require('foremost')('prolific.shuttle')
    shuttle.start(logger)
    destructible.destruct.wait(shuttle, 'close')

    destructible.completed.wait(async())

    console.log

    async([function () {
        destructible.destroy()
    }], function () {
        destructible.monitor('olio', Olio, async())
    }, function (olio) {
        olio.sender('echo', cadence(function (async, destructible) {
            destructible.monitor('caller', Caller, async())
        }), async())
    }, function (sender) {
        var reactor = new Reactor({
            echo: cadence(function (async, request, index) {
                async(function () {
                    sender.processes[+index].invoke({
                        url: request.url,
                        body: request.body
                    }, async())
                }, function (response) {
                    return response
                })
            }),
            index: cadence(function (async) {
                return 'Hello, World! ' + program.ultimate.port + '\n'
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
            server.listen(+program.ultimate.port, async())
        }, function () {
            delta(destructible.monitor('http')).ee(server).on('close')
        })
    }, function () {
        logger.info('started', { parameters: program.ultimate })
        destructible.completed.wait(async())
    })
}))
