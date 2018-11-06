var cadence = require('cadence')
var Signal = require('signal')

var Binder = require('./binder')

var Procession = require('procession')

var Cubbyhole = require('cubbyhole')

var Conduit = require('conduit')

function Dispatcher (destructible, transmitter, callback) {
    this._ready = new Signal
    this._ready.wait(callback)
    this.transmitter = transmitter
    var messages = this.transmitter.messages.parent.pump(this, 'dispatch').run(destructible.monitor('messages'))
    destructible.destruct.wait(messages, 'destroy')
    this.destructible = destructible
    this.siblings = new Cubbyhole
    this.transmitter.register()
}

Dispatcher.prototype._createBinder = function (destructible, message) {
    return new Binder(this, message)
}

Dispatcher.prototype._createReceiver = cadence(function (async, destructible, message, socket) {
    async(function () {
        destructible.monitor('receiver', this.Receiver, message.from, message.to, async())
    }, function (receiver) {
        destructible.monitor('conduit', Conduit, receiver, socket, socket, async())
    }, function (conduit) {
        conduit.receiver.outbox.push({ module: 'olio', method: 'connect' })
    })
})

Dispatcher.prototype.dispatch = cadence(function (async, envelope) {
    if (envelope == null) {
        return
    }
    var message = envelope.message, socket = envelope.socket
    console.log('got', message, !! socket)
    switch (message.method) {
    case 'initialize':
        this._ready.unlatch(null, this._createBinder(this, message), message.properties)
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
