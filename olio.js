// Node.js API.
var assert = require('assert')
var events = require('events')

// Contextualized callbacks and event handlers.
var Operation = require('operation')

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
var descendent = require('foremost')('descendent')

// Convert key material into an index into a table.
var indexify = require('./indexify')

// Pipe construction around UNIX domain sockets.
var SocketFactory = require('./socketeer')

var Interrupt = require('interrupt').createInterrupter('olio')

// Olio configurator object.
function Constructor (olio) {
    this._olio = olio
}

Constructor.prototype.sender = function (name, Receiver) {
    var ready = new Signal
    this._olio._latches.push(ready)
    this._olio._destructible.destruct.wait(ready, 'unlatch')
    this._olio._map[name] = { count: null, Receiver: Receiver, receivers: [], ready: ready  }
}

// TODO Something like this.
/*
function Sibling (receivers, paths, count) {
    this.processes = []
    for (var i = 0; i < count; i++) {
        this.processes.push({ sender: receivers[i], path: paths[i], index: i })
    }
    this.count = count
}

Sibling.prototype.hash = function (key) {
    var buffer = Buffer.from(Keyify.serialize(key))
    return this.processes[fnv(0, buffer, 0, buffer.length) % this.count]
}
*/

function Olio (destructible, ee, configurator) {
    this._destructible = destructible
    this._destructible.destruct.wait(this, function () { this.destroyed = true })

    this.destroyed = false

    this._senders = { array: [], map: {} }
    this._map = {}
    this._latches = []

    this.ready = new Signal

    this._latches.push(this._initialized = new Signal)
    destructible.destruct.wait(this._initialized, 'unlatch')

    var constructor = new Constructor(this)
    configurator(constructor)

    this._Receiver = constructor.receiver

    // Any error causes messages to get cut, we do not get `_message`.
    descendent.increment()
    destructible.destruct.wait(descendent, 'decrement')
    descendent.on('olio:message', Operation([ this, '_message' ]))
    descendent.across('olio:mock', {})
    descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})
    this._unlatch(descendent, this._destructible.monitor('ready', true))

    this._factory = new SocketFactory
}

Olio.prototype.path = function (name, index) {
    var sender = this._map[name]
    index = indexify(index, sender.count)
    return sender.paths[index]
}

Olio.prototype.sender = function (name, index) {
    var sender = this._map[name]
    index = indexify(index, sender.count)
    return sender.receivers[index]
}

Olio.prototype.count = function (path, index) {
    return this._map[path].count
}

// TODO Maybe use cubbyhole to index by a particular name or, rather, argument path?
// TODO Looks like two flavors of "ready."
Olio.prototype._dispatch = cadence(function (async, message, handle) {
    switch (message.method) {
    case 'factory':
        this._factory = handle
        break
    case 'initialize':
        this._name = message.name
        this._argv = message.argv
        this._index = message.index
        this._initialized.unlatch()
        break
    case 'connect':
        // TODO This is also swallowing errors somehow.
        this._destructible.monitor([ 'connect', message ], this._factory, 'createReceiver', this._Receiver, message, handle, async())
        break
    case 'created':
        var sender = this._map[message.name], i = 0
        if (sender == null) {
            this._map[message.name] = {
                paths: message.paths,
                count: message.count
            }
        } else {
            sender.paths = message.paths
            sender.count = message.count
            async([function () {
                var loop = async(function () {
                    if (i == message.count) {
                        return [ loop.break ]
                    }
                    this._destructible.monitor([ 'created', message.argv, i ], this._factory, 'createSender', {
                        argv: this._argv,
                        name: this._name,
                        index: this._index,
                    }, sender.Receiver, message, handle, i, sender.count, async())
                }, function (receiver) {
                    sender.receivers[i++] = receiver
                })()
            }, function (error) {
                var ready = new Signal
                this._latches.push(ready)
                this._destructible.destruct.wait(ready, 'unlatch')
                sender.ready.unlatch()
                throw error
            }], function () {
                sender.ready.unlatch()
            })
        }
        break
    }
})

// Any error causes messages to get cut.
Olio.prototype._message = function (message, handle) {
    this._dispatch(message.body, handle, this._destructible.monitor([ 'message', message.body ], true))
}

// TODO You're working through this right now.
//
// If one of our sender creators raises an error, we are ready with the error.
// Our destructible will gather up any other waiting initialzers, so that we
// will still get a full bouquet of errors through the destructible. We're
// turnign the corner here, you see, with an initialization stack that is
// waiting on the Olio constructor and multiple senders. Ready is not waiting on
// receivers, it waiting for all senders to be ready. Thus, we go forward when
// we have all our senders. We can still error building a receiver, though.
// (Let's put this in our unit tests.)
//
// Ordered thoughts.
//
// * We are waiting for all our senders to be ready because we cannot use the
// Olio until all the senders are ready.
// * Waiting on receivers is probably a function of having a countdow latch
// elsewhere that is waiting for incoming signals. Not a use case I've
// encountered yet though.
// * An error initializing a sender will cause us to be ready, but we report
// ready by passing the error.

//
Olio.prototype._unlatch = cadence(function (async, descendent) {
    async(function () {
        var loop = async(function () {
            if (this._latches.length == 0) {
                return [ loop.break ]
            }
            this._latches.shift().wait(async())
        })()
    }, function () {
        descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})
        this.ready.unlatch()
    })
})

module.exports = cadence(function (async, destructible, ee, configurator) {
    var olio = new Olio(destructible, ee, configurator)
    async(function () {
        olio.ready.wait(async())
    }, function () {
        // TODO This makes `unready` in Destructible seem dubious. No, it's not.
        // The unready error will trigger if `destroy` is called before we are
        // ready. Likely we will wreck initialization with a destroyed
        // Destructible. Come back and think hard, but for now it seems that we
        // are going to have this marked destroyed.
        Interrupt.assert(!destructible.destroyed, 'destroyed')
        return [ olio ]
    })
})
