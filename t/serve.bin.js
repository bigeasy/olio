var cadence = require('cadence')
var http = require('http')
var delta = require('delta')

module.exports = cadence(function (async, destructible, binder) {
    var logger = require('prolific.logger').createLogger('olio.http')
    var Reactor = require('reactor')
    var Caller = require('conduit/caller')
    var reactor = new Reactor({
        sequence: 0,
        echo: cadence(function (async, request, index) {
            async(function () {
                olio.sender('run', +index).invoke({
                    url: request.url,
                    body: request.body
                }, async())
            }, function (response) {
                return response
            })
        }),
        message: cadence(function (async, request, index) {
            async(function () {
                var shifter = olio.messages.shifter(), sequence = this.sequence++
                async(function () {
                    olio.send('run', +index, { method: 'send', sequence: sequence }, async())
                }, function () {
                    shifter.join(function (message) {
                        return message.sequence = sequence
                    }, async())
                })
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
        dispatcher.dispatch('POST /worker/:id/message', 'message')
        dispatcher.logger = function (entry) {
            console.log(entry)
        }
    })
    async(function () {
        binder.listen(null, async())
    }, function (olio) {
        olio.sender('run', cadence(function (async, destructible) {
            async(function () {
                destructible.monitor('caller', Caller, async())
            }, function (caller) {
                destructible.destruct.wait(caller.outbox, 'end')
            })
        }), async())
    }, function (caller) {
        var server = http.createServer(reactor.middleware)
        async(function () {
            destructible.destruct.wait(server, 'close')
            server.listen(8888)
            delta(async()).ee(server).on('listening')
            server.on('listening', function () { console.log('yes, listening') })
        }, function () {
            delta(destructible.monitor('http')).ee(server).on('close')
            server.on('close', function () { console.log('closing!!!') })
        })
    })
})
