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

    var Destructible = require('destructible')
    var destructible = new Destructible('./bin/http.bin.js')

    var olio = new Olio(program, function (constructor) {
        constructor.middleware = reactor.middleware
        constructor.sender([ './bin/echo.bin.js' ], function (index) {
            return new Requester
        })
    })

    program.on('shutdown', destructible.destroy.bind(destructible))

    olio.listen(destructible.monitor('olio'))
    destructible.addDestructor('olio', olio, 'destroy')

    var http = require('http')


    var delta = require('delta')

    var Thereafter = require('thereafter')
    var thereafter = new Thereafter

    destructible.addDestructor('thereafter', thereafter, 'cancel')

    thereafter.run(function (ready) {
        olio.ready.wait(ready, 'unlatch')
    })

    thereafter.run(function (ready) {
        var server = http.createServer(reactor.middleware)
        var cluster = require('cluster')
        delta(destructible.monitor('http')).ee(server).on('close')
        destructible.addDestructor('connection', cluster.worker, 'disconnect')
        destructible.addDestructor('server', server, 'close')
        server.listen(8080)
        ready.unlatch()
    })

    destructible.completed(900, async())
}))
