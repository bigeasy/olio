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

SocketFactory.prototype.createReceiver = cadence(function (async, destructible, olio, message, socket) {
    async(function () {
        destructible.monitor('receiver', olio._receiver, message.argv, async())
    }, function (receiver) {
        destructible.destruct.wait(function () { receiver.inbox.push(null) })
        destructible.destruct.wait(socket, 'destroy')
        destructible.monitor('conduit', Conduit, socket, socket, receiver, async())
    }, function () {
        socket.write(new Buffer([ 0xaa, 0xaa, 0xaa, 0xaa ]), async())
    })
})

SocketFactory.prototype.createSender = cadence(function (async, destructible, from, sender, message, handle, index) {
    var through = new stream.PassThrough
    var readable = new Staccato.Readable(through)
    var cookie = destructible.destruct.wait(readable, 'destroy')

    async(function () {
        var request = http.request({
            socketPath: message.socketPath,
            url: 'http://olio',
            headers: Downgrader.headers({
                'x-olio-to-index': index,
                'x-olio-to-argv': JSON.stringify(message.argv),
                'x-olio-from-index': from.index,
                'x-olio-from-argv': JSON.stringify(from.argv)
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
            destructible.monitor('receiver', sender.builder, message.argv, index, message.count, async())
        }, function (receiver) {
            async(function () {
                destructible.monitor('conduit', Conduit, socket, socket, receiver, async())
            }, function (conduit) {
                sender.receivers[index] = receiver
                destructible.destruct.wait(function () { receiver.inbox.push(null) })
            })
        })
    })
})

module.exports = SocketFactory
