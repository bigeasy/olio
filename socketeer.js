var Conduit = require('conduit')
var Destructible = require('destructible')
var cadence = require('cadence')
var util = require('util')
var Signal = require('signal')
var stream = require('stream')
var Staccato = require('staccato')
var http = require('http')
var Downgrader = require('downgrader')
var delta = require('delta')
var Interrupt = require('interrupt').createInterrupter('olio')
var coalesce = require('extant')
var Procession = require('procession')

function SocketFactory () {
}

SocketFactory.prototype.createReceiver = cadence(function (async, destructible, Receiver, message, socket) {
    async(function () {
        destructible.monitor('receiver', Receiver, message.from, message.to, async())
    }, function (receiver) {
        destructible.destruct.wait(function () { receiver.inbox.push(null) })
        destructible.destruct.wait(socket, 'destroy')
        destructible.monitor('conduit', Conduit, socket, socket, receiver, async())
    }, function (conduit) {
        console.log('pushing', conduit.receiver.outbox)
        conduit.receiver.outbox.push({ module: 'olio', method: 'connect' })
    })
})

SocketFactory.prototype.createSender = cadence(function (async, destructible, from, Receiver, message, handle, index) {
    var through = new stream.PassThrough
    var readable = new Staccato.Readable(through)
    var cookie = destructible.destruct.wait(readable, 'destroy')

    async(function () {
        var request = http.request({
            socketPath: message.socketPath,
            url: 'http://olio',
            headers: Downgrader.headers({
                'x-olio-to-index': index,
                'x-olio-to-name': message.name,
                'x-olio-from-index': from.index,
                'x-olio-from-name': from.name
            })
        })
        delta(async()).ee(request).on('upgrade')
        request.end()
    }, function (request, socket, head) {
        destructible.destruct.wait(socket, 'destroy')
        async(function () {
            destructible.monitor('receiver', Receiver, message.argv, index, message.count, async())
        }, function (receiver) {
                    console.log('sipping')
            var sip = {
                outbox: receiver.outbox,
                inbox: new Procession
            }
            var shifter = sip.inbox.shifter()
                    console.log('sipping')
            async(function () {
                destructible.monitor('conduit', Conduit, socket, socket, sip, head, async())
            }, function (conduit) {
                console.log('>>', shifter.shift())
                async(function () {
                    console.log('waiting')
                    shifter.dequeue(async())
                }, function (header) {
                    console.log('HEADER --', header)
                    Interrupt.assert(header.module == 'olio' && header.method == 'connect', 'failed to start middleware')
                    Interrupt.assert(shifter.shift() == null, 'unexpected traffic on connect')
                    conduit.receiver = receiver
                    // Do we do this or do we register an end to pumping instead? It
                    // would depend on how we feal about ending a Conduit. I do
                    // believe it pushed out a `null` to indicate that the stream
                    // has closed. A Window would look for this and wait for
                    // restart. The Window needs to be closed explicity.
                    destructible.destruct.wait(function () { receiver.inbox.push(null) })
                })
            }, function() {
                return [ receiver ]
            })
        })
    })
})

module.exports = SocketFactory
