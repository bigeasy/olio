// Node.js API.
var assert = require('assert')
var events = require('events')

// Contextualized callbacks and event handlers.
var Operation = require('operation/variadic')

// An evented semaphore.
var Signal = require('signal')

// Return the first not null-like value.
var coalesce = require('extant')

// Asynchronous control flow.
var cadence = require('cadence')

// Do nothing.
var noop = require('nop')

// Generate a unique, canonical string key from a JSON object.
var Keyify = require('keyify')

// Controlled demolition of asynchronous operations.
var Destructible = require('destructible')

// Route messages through a process hierarchy using Node.js IPC.
var Descendent = require('descendent')

// Associate command lines used to start children with child information.
var Map = require('./map')

// Convert key material into an index into a table.
var indexify = require('./indexify')

// Pipe construction around UNIX domain sockets.
var SocketFactory = require('./factory/socket')

// Olio configurator object.
function Constructor (olio) {
    this._olio = olio
}

Constructor.prototype.sender = function (argv, Receiver) {
    var ready = new Signal
    this._olio._latches.push(ready)
    this._olio._map.push(argv, { count: null, Receiver: Receiver, receivers: [], ready: ready  })
}

function Olio (destructible, ee, configurator) {
    this._senders = { array: [], map: {} }
    this._map = new Map
    this._latches = []

    this.ready = new Signal

    this._latches.push(this._initialized = new Signal)

    var constructor = new Constructor(this)
    configurator(constructor)

    this._Receiver = constructor.receiver
    this._shutdown = coalesce(constructor.shutdown, noop)

    this._destructible = new Destructible(750, 'olio')
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._ready(this._destructible.monitor('ready', true))

    var descendent = new Descendent(ee)
    this._destructible.destruct.wait(descendent, 'destroy')
    descendent.on('olio:message', Operation([ this, '_message' ]))
    descendent.across('olio:mock', {})

    this._factory = new SocketFactory
}

Olio.prototype.sender = function (path, index) {
    var sender = this._map.get(path)
    index = indexify(index, sender.count)
    return sender.receivers[index]
}

Olio.prototype.count = function (path, index) {
    return this._map.get(path).count
}

// TODO Maybe use cubbyhole to index by a particular name or, rather, argument path?
// TODO Looks like two flavors of "ready."
Olio.prototype._dispatch = cadence(function (async, message, handle) {
    switch (message.method) {
    case 'factory':
        this._factory = handle
        break
    case 'initialize':
        this._argv = message.argv
        this._index = message.index
        this._initialized.unlatch()
        break
    case 'connect':
        this._destructible.monitor([ 'connect', message ], this._factory, 'createReceiver', this._Receiver, message, handle, async())
        break
    case 'created':
        var sender = this._map.get(message.argv), i = 0
        if (sender != null) {
            sender.count = message.count
            var ready = new Signal
            this._latches.push(ready)
            async([function () {
                var loop = async(function () {
                    if (i == message.count) {
                        return [ loop.break ]
                    }
                    this._destructible.monitor([ 'created', message.argv, i ], this._factory, 'createSender', {
                        argv: this._argv,
                        index: this._index,
                    }, sender.Receiver, message, handle, i, sender.count, async())
                }, function (receiver) {
                    sender.receivers[i++] = receiver
                })()
            }, function (error) {
                ready.unlatch(error)
                sender.ready.unlatch(error)
            }], function () {
                ready.unlatch()
                sender.ready.unlatch()
            })
        }
        break
    case 'shutdown':
        this._shutdown.call()
        break
    }
})

Olio.prototype._message = function (path, message, handle) {
    this._dispatch(message, handle, this._destructible.monitor([ 'dispatch', message ], true))
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

module.exports = cadence(function (async, destructible, ee, configurator) {
    var olio = new Olio(destructible, ee, configurator)
    destructible.destruct.wait(olio, 'destroy')
    olio.listen(destructible.monitor('olio'))
    async(function () {
        olio.ready.wait(async())
    }, function () {
        return [ olio ]
    })
})
