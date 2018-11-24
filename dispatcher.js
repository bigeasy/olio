var cadence = require('cadence')

var Signal = require('signal')

var Cubbyhole = require('cubbyhole')

var Staccato = require('staccato')

var Socket = require('procession/socket')(require('./hangup'))

var Olio = require('./olio')

var Turnstile = require('turnstile/redux')
var restrictor = require('restrictor')

function Dispatcher (destructible, transmitter) {
    this.ready = new Signal
    this.transmitter = transmitter
    this.destructible = destructible
    this.siblings = new Cubbyhole

    this.turnstile = new Turnstile

    this.turnstile.listen(destructible.monitor('turnstile'))
    destructible.destruct.wait(this.turnstile, 'destroy')
}

Dispatcher.prototype.fromSibling = function (message, socket) {
    this._olio.emit(message.name, message.body, socket)
}

Dispatcher.prototype._createReceiver = cadence(function (async, destructible, message, socket) {
    async(function () {
        var readable = new Staccato.Readable(socket)
        var writable = new Staccato.Writable(socket)
        destructible.monitor('socket', Socket, { label: 'receiver', message: message }, readable, writable, async())
    }, function (inbox, outbox) {
        async(function () {
            destructible.monitor('receiver', this.receiver, 'connect', inbox, outbox, async())
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
                this.destructible.monitor('olio', Olio, this, message, async())
            }, function (olio) {
                this._olio = olio
                this.ready.unlatch(null, olio, message.properties)
            })
            break
        case 'connect':
            // TODO This is also swallowing errors somehow.
            this.destructible.monitor([ 'receiver', message ], this, '_createReceiver', message, socket, async())
            break
        case 'created':
            this.siblings.set(message.name, null, {
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
