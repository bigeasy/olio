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

SocketFactory.prototype.createReceiver = cadence(function (async, olio, message, socket) {
    var receiver = olio._receiver.call(null, message.argv)

    var destructible = new Destructible([ 'receiver', message.from  ])
    olio._destructible.destruct.wait(destructible, 'destroy')

    async(function () {
        var conduit = new Conduit(socket, socket, receiver)
        conduit.ready.wait(async())
        destructible.destruct.wait(conduit, 'destroy')
        destructible.destruct.wait(socket, 'destroy')
        conduit.listen(null, olio._destructible.monitor([ 'receiver', message.from ]))
    }, function () {
        socket.write(new Buffer([ 0xaa, 0xaa, 0xaa, 0xaa ]), async())
    })
})

SocketFactory.prototype.createSender = cadence(function (async, from, sender, message, handle, index, initializer) {
    console.log(arguments)
    var receiver = sender.builder.call(null, message.argv, index, message.count)
    var through = new stream.PassThrough
    var readable = new Staccato.Readable(through)
    var cookie = initializer.destructor(readable, 'destroy')
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
        async(function () {
            readable.read(4, async())
            through.write(head)
            socket.pipe(through)
        }, function (buffer) {
            interrupt.assert(buffer != null && buffer.length == 4, 'closed before start')
            interrupt.assert(buffer.toString('hex'), 'aaaaaaaa', 'failed to start middleware')
            socket.unpipe(through)

            coalesce(initializer.cancel(cookie), noop)()
            readable.destroy()

            var conduit  = new Conduit(socket, socket, receiver)

            initializer.destructor(conduit, 'destroy')
            initializer.destructor(socket, 'destroy')
            sender.receivers[index] = { conduit: conduit, receiver: receiver }
            conduit.listen(null, async())
            initializer.ready()
        })
    })
})

module.exports = SocketFactory
