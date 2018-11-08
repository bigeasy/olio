var cadence = require('cadence')
var http = require('http')
var delta = require('delta')

module.exports = cadence(function (async, destructible, binder) {
    var logger = require('prolific.logger').createLogger('olio.http')
    var Reactor = require('reactor')
    var Caller = require('conduit/caller')
    async(function () {
        binder.listen(null, async())
    }, function (olio) {
        async(function () {
            olio.sender('run', cadence(function (async, destructible) {
                async(function () {
                    destructible.monitor('caller', Caller, async())
                }, function (caller) {
                    destructible.destruct.wait(caller.outbox, 'end')
                })
            }), async())
        }, function (caller) {
        console.log('got CALLER!!!!')
            var reactor = new Reactor({
                sequence: 0,
                conduit: cadence(function (async, request, index) {
                    async(function () {
                        caller.hash(String(index)).conduit.connect({
                            url: request.url,
                            body: request.body
                        }).inbox.dequeue(async())
                    }, function (response) {
                        return [ 200, { 'content-type': 'application/json' }, response ]
                    })
                }),
                message: cadence(function (async, request, index) {
                    async(function () {
                    console.log('ipc called!!!!!')
                        var shifter = olio.messages.shifter(), sequence = this.sequence++
                        async(function () {
                            olio.send('run', +index, { method: 'send', sequence: sequence }, async())
                        }, function () {
                            shifter.join(function (message) {
                                return message.body.sequence == sequence
                            }, async())
                        })
                    }, function (response) {
                        return [ 200, { 'content-type': 'application/json' }, response.body.sequence ]
                    })
                }),
                index: cadence(function (async) {
                    return 'Hello, World!\n'
                })
            }, function (dispatcher) {
                dispatcher.dispatch('GET /', 'index')
                dispatcher.dispatch('POST /worker/:id/conduit', 'conduit')
                dispatcher.dispatch('POST /worker/:id/ipc', 'message')
                dispatcher.logger = function (entry) {
                    if (entry.error) {
                        console.log(entry.error.stack)
                    }
                }
            })
            var server = http.createServer(reactor.middleware)
            async(function () {
                destructible.destruct.wait(server, 'close')
                server.listen(8888)
                delta(async()).ee(server).on('listening')
            }, function () {
                delta(destructible.monitor('http')).ee(server).on('close')
            })
        })
    })
})
