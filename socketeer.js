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
var interrupt = require('interrupt').createInterrupter('olio')
var coalesce = require('extant')
var noop = require('nop')

function SocketFactory () {
}

SocketFactory.prototype.createReceiver = cadence(function (async, destructible, Receiver, message, socket) {
    async(function () {
        destructible.monitor('receiver', Receiver, message.from, message.to, async())
    }, function (receiver) {
        destructible.destruct.wait(function () { receiver.inbox.push(null) })
        destructible.destruct.wait(socket, 'destroy')
        destructible.monitor('conduit', Conduit, socket, socket, receiver, async())
    }, function () {
        socket.write(Buffer.from([ 0xaa, 0xaa, 0xaa, 0xaa ]), async())
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
            readable.read(4, async())
            through.write(head)
            socket.pipe(through)
        }, function (buffer) {
            interrupt.assert(buffer != null && buffer.length == 4, 'closed before start')
            interrupt.assert(buffer.toString('hex'), 'aaaaaaaa', 'failed to start middleware')
            socket.unpipe(through)

            coalesce(destructible.destruct.cancel(cookie), noop)()
            readable.destroy()
        }, function () {
            destructible.monitor('receiver', Receiver, message.argv, index, message.count, async())
        }, function (receiver) {
            async(function () {
                destructible.monitor('conduit', Conduit, socket, socket, receiver, async())
            }, function () {
                // Do we do this or do we register an end to pumping instead? It
                // would depend on how we feal about ending a Conduit. I do
                // believe it pushed out a `null` to indicate that the stream
                // has closed. A Window would look for this and wait for
                // restart. The Window needs to be closed explicity.
                destructible.destruct.wait(function () { receiver.inbox.push(null) })
            }, function() {
                return [ receiver ]
            })
        })
    })
})

module.exports = SocketFactory
