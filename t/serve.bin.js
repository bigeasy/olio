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
    var Requester = require('conduit/requester')
    var Reactor = require('reactor')
    var reactor = new Reactor({
        echo: cadence(function (async, request, index) {
            async(function () {
                console.log(+index)
                olio.sender([ './bin/echo.bin.js' ], +index).request({
                    url: request.url,
                    body: request.body
                }, async())
            }, function (response) {
                console.log(response)
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

    var finalist = require('finalist')

    var Destructible = require('destructible')
    var destructible = new Destructible(900, './bin/http.bin.js')
    program.on('shutdown', destructible.destroy.bind(destructible))

    var logger = require('prolific.logger').createLogger('olio.http')
    var Shuttle = require('prolific.shuttle')
    console.log('start shuttle')
    var shuttle = Shuttle.shuttle(program, logger)
    console.log('shuttling')
    destructible.addDestructor('shuttle', shuttle, 'close')

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        var olio = new Olio(program, function (constructor) {
            constructor.sender([ './t/run.bin.js' ], function (index) {
                return new Requester
            })
        })

        finalist(function (callback) {
            destructible.completed.wait(callback)
            olio.ready.wait(callback)
        }, async())

        destructible.addDestructor('olio', olio, 'destroy')
        olio.listen(destructible.monitor('olio'))
    }, function () {
        var http = require('http')
        var cluster = require('cluster')
        var delta = require('delta')

        var server = http.createServer(reactor.middleware)
        async(function () {
            destructible.addDestructor('connection', cluster.worker, 'disconnect')
            destructible.addDestructor('server', server, 'close')

            server.listen(8080, async())
        }, function () {
            delta(destructible.monitor('http')).ee(server).on('close')
        })
    }, function () {
        logger.info('started', { http: true })
        destructible.completed.wait(async())
    })
}))