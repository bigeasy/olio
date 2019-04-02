var cadence = require('cadence')

var Signal = require('signal')

var Cubbyhole = require('cubbyhole')

var Procession = require('procession')
var Reader = require('procession/reader')
var Writer = require('procession/writer')

var Olio = require('./olio')

var Keyify = require('keyify')

var Turnstile = require('turnstile')
var restrictor = require('restrictor')

var logger = require('prolific.logger').createLogger('olio')

var stackify = require('./stackify')

function Dispatcher (destructible, transmitter) {
    this.olio = new Signal
    this.transmitter = transmitter
    this.destructible = destructible

    this.ready = new Cubbyhole
    this.registered = new Cubbyhole

    this.turnstile = new Turnstile

    this.turnstile.listen(destructible.durable('turnstile'))
    destructible.destruct.wait(this.turnstile, 'destroy')
}

Dispatcher.prototype.fromSibling = function (message, socket) {
    this.olio.open[1].emit(message.name, message.body, socket)
}

Dispatcher.prototype._createReceiver = cadence(function (async, destructible, message, socket) {
    async(function () {
        socket.on('error', stackify(logger, 'receiver.socket'))

        var reader = new Reader(new Procession, socket)
        destructible.destruct.wait(reader, 'destroy')
        reader.read(destructible.durable('socket.read'))

        var writer = new Writer(new Procession, socket)
        destructible.destruct.wait(writer, 'destroy')
        writer.write(destructible.durable('socket.write'))

        destructible.completed.wait(function () {
            socket.destroy()
        })
        return [ reader.inbox, writer.outbox ]
    }, function (inbox, outbox) {
        async(function () {
            destructible.durable('receiver', this.receiver, 'connect', inbox, outbox, async())
        }, function (conduit) {
            outbox.push({ module: 'olio', method: 'connect' })
        })
    })
})

Dispatcher.prototype.fromParent = restrictor.push(cadence(function (async, envelope) {
    var message = envelope.body.shift(), socket = envelope.body.shift()
    if (envelope.canceled) {
        if (socket != null) {
            socket.destroy()
        }
    } else {
        switch (message.method) {
        case 'initialize':
            async(function () {
                this.destructible.durable('olio', Olio, this, message, async())
            }, function (olio) {
                this.olio.unlatch(null, olio, message.source, message.properties)
            })
            break
        case 'registered':
            this.registered.set(Keyify.stringify([ message.name, message.index ]), null, {
                name: message.name,
                index: message.index,
                address: message.address,
                count: message.count
            })
            break
        case 'connect':
            // TODO This is also swallowing errors somehow.
            this.destructible.durable([ 'receiver', message ], this, '_createReceiver', message, socket, async())
            break
        case 'created':
            this.ready.set(message.name, null, {
                name: message.name,
                addresses: message.addresses,
                count: message.count
            })
            break
        }
    }
}))

module.exports = cadence(function (async, destructible, transmitter) {
    return new Dispatcher(destructible, transmitter)
})
