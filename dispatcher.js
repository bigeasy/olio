var cadence = require('cadence')
var Signal = require('signal')
var Procession = require('procession')

var Cubbyhole = require('cubbyhole')

var Conduit = require('conduit')

var Olio = require('./olio')

var Staccato = require('staccato')

var logger = require('prolific.logger').createLogger('olio')

var Socket = require('procession/socket')(require('./hangup'))

function Dispatcher (destructible, transmitter, callback) {
    this._ready = new Signal
    this._ready.wait(callback)
    this.transmitter = transmitter
    destructible.monitor('messages', transmitter.messages.parent.pump(this, '_dispatch'), 'destructible', null)
    destructible.monitor('siblings', transmitter.messages.siblings.pump(this, '_sibling'), 'destructible', null)
    this.destructible = destructible
    this.siblings = new Cubbyhole
    this.transmitter.register()
}

Dispatcher.prototype._sibling = cadence(function (async, envelope) {
    if (envelope != null) {
        this.receiver.message(envelope, async())
    }
})

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

Dispatcher.prototype._dispatch = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    var message = envelope.message, socket = envelope.socket
    console.log('got', message, !! socket)
    switch (message.method) {
    case 'initialize':
        this._name = message.name
        this._index = message.index
        async(function () {
            this.destructible.monitor('olio', Olio, this, message, async())
        }, function (olio) {
            this._ready.unlatch(null, this, olio, message.properties)
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
})

module.exports = cadence(function (async, destructible, transmitter) {
    new Dispatcher(destructible, transmitter, async())
})
