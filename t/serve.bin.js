var cadence = require('cadence')
var http = require('http')
var delta = require('delta')
var Conduit = require('conduit/conduit')
var Signal = require('signal')

function Serve (olio) {
    this._olio = olio
    this.got = new Signal
}

module.exports = cadence(function (async, destructible, olio) {
    destructible.destruct.wait(function () { console.log('SERVE DESTROYED') })
    var logger = require('prolific.logger').createLogger('olio.http')
    var Reactor = require('reactor')
    var Caller = require('conduit/caller')
    var serve = new Serve
    olio.on('application:response', function (message) {
        serve.got.unlatch(null, message)
    })
    async(function () {
        console.log('WILL CREATE SENDERS')
        olio.sender('run', cadence(function (async, destructible, inbox, outbox) {
            destructible.durable('conduit', Conduit, inbox, outbox, null, async())
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
                    var sequence = this.sequence++
                    async(function () {
                        olio.send('run', +index, 'application:request', sequence)
                    }, function () {
                        console.log('waiting')
                        serve.got.wait(async())
                    }, function (got) {
                        console.log('>>>', got)
                        return got
                    })
                }, function (response) {
                    return [ 200, { 'content-type': 'application/json' }, response ]
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
            delta(destructible.durable('http')).ee(server).on('close')
            return serve
        })
    })
})
