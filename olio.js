var Operation = require('operation/variadic')
var Signal = require('signal')
var Map = require('./map')
var indexify = require('./indexify')
var SocketFactory = require('./factory/socket')
var noop = require('nop')
var coalesce = require('extant')

function Constructor (olio) {
    this._olio = olio
}

Constructor.prototype.sender = function (argv, builder) {
    var ready = new Signal
    this._olio._latches.push(ready)
    this._olio._map.push(argv, { count: null, builder: builder, receivers: [], ready: ready  })
}

var cadence = require('cadence')
var Destructible = require('destructible')
var Keyify = require('keyify')
var Descendent = require('descendent')

function Olio (program, configurator) {
    this._senders = { array: [], map: {} }
    this._map = new Map
    this._latches = []

    this.ready = new Signal

    this._latches.push(this._initialized = new Signal)

    var constructor = new Constructor(this)
    configurator(constructor)

    this._receiver = constructor.receiver
    this._shutdown = coalesce(constructor.shutdown, noop)

    this._destructible = new Destructible(750, 'olio')
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._ready(this._destructible.rescue('ready'))

    var factory = this._factory = new SocketFactory(program)

    var descendent = new Descendent(program)
    this._destructible.addDestructor('descendent', descendent, 'destroy')
    descendent.on('olio:message', Operation([ this, '_message' ]))
}

Olio.prototype.sender = function (path, index) {
    var sender = this._map.get(path)
    index = indexify(index, sender.count)
    return sender.receivers[index].receiver
}

Olio.prototype.count = function (path, index) {
    return this._map.get(path).count
}

Olio.prototype._message = function (path, message, socket) {
    switch (message.method) {
    case 'initialize':
        this._argv = message.argv
        this._index = message.index
        this._initialized.unlatch()
        break
    case 'connect':
        this._factory.createReceiver(this, message, socket, this._destructible.rescue([ 'connect', message ]))
        break
    case 'created':
        var sender = this._map.get(message.argv)
        if (sender != null) {
            sender.count = message.count
            for (var i = 0; i < message.count; i++) {
                this._factory.createSender(this, sender, message, null, i, this._destructible.monitor([ 'sender', message.argv, i ]))
            }
            sender.ready.unlatch()
        }
        break
    case 'shutdown':
        this._shutdown.call()
        break
    }
}

Olio.prototype._ready = cadence(function (async) {
    async(function () {
        var loop = async(function () {
            if (this._latches.length == 0) {
                return [ loop.break ]
            }
            this._latches.shift().wait(async())
        })()
    }, function () {
        this.ready.unlatch()
    })
})

Olio.prototype.destroy = function () {
    this._destructible.destroy()
}

Olio.prototype.listen = function (callback) {
    this._destructible.completed.wait(callback)
}

module.exports = Olio
