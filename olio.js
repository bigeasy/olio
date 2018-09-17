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

// Pipe construction around UNIX domain sockets.
var SocketFactory = require('./socketeer')

var Cubbyhole = require('cubbyhole')

var fnv = require('hash.fnv')

var Interrupt = require('interrupt').createInterrupter('olio')

function Sender (receivers, paths, count) {
    this.processes = []
    for (var i = 0; i < count; i++) {
        this.processes.push({ sender: receivers[i], path: paths[i], index: i })
    }
    this.count = count
}

Sender.prototype.hash = function (key) {
    var buffer = Buffer.from(Keyify.stringify(key))
    return this.processes[fnv(0, buffer, 0, buffer.length) % this.count]
}

function Olio (destructible, initialized, Receiver) {
    this._destructible = destructible
    this._destructible.destruct.wait(this, function () { this.destroyed = true })

    this.destroyed = false

    this._Receiver = Receiver

    this._initialized = initialized

    this._siblings = new Cubbyhole

    this._factory = new SocketFactory

    // Any error causes messages to get cut, we do not get `_message`.
    descendent.increment()
    destructible.destruct.wait(descendent, 'decrement')
    descendent.on('olio:message', Operation([ this, '_message' ]))
    descendent.across('olio:mock', {})
    descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})
}

Olio.prototype.sibling = cadence(function (async, name) {
    this._siblings.wait(name, async())
})

Olio.prototype.sender = cadence(function (async, name, Receiver) {
    async(function () {
        this.sibling(name, async())
    }, function (sibling) {
        var i = 0, receivers = []
        async(function () {
            var loop = async(function () {
                if (i == sibling.count) {
                    return [ loop.break ]
                }
                // TODO `message.name` instead.
                this._destructible.monitor([ 'created', sibling.name, i ], this._factory, 'createSender', {
                    argv: this._argv,
                    name: this._name,
                    index: this._index,
                }, Receiver, sibling, sibling.handle, i, sibling.count, async())
            }, function (receiver) {
                receivers[i++] = receiver
            })()
        }, function () {
            return new Sender(receivers, sibling.paths, sibling.count)
        })
    })
})

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
        this._siblings.set(message.name, null, {
            name: message.name,
            paths: message.paths,
            count: message.count,
            argv: message.argv,
            socketPath: message.socketPath,
            handle: coalesce(handle)
        })
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

module.exports = cadence(function (async, destructible, Receiver) {
    var initialized = new Signal
    var olio = new Olio(destructible, initialized, coalesce(Receiver))
    async(function () {
        initialized.wait(async())
    }, function () {
        // TODO Now `ready` doens't seem necessary because everything happens on
        // initialization.
        descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})
        // TODO This makes `unready` in Destructible seem dubious. No, it's not.
        // The unready error will trigger if `destroy` is called before we are
        // ready. Likely we will wreck initialization with a destroyed
        // Destructible. Come back and think hard, but for now it seems that we
        // are going to have this marked destroyed.
        Interrupt.assert(!destructible.destroyed, 'destroyed')
        return [ olio ]
    })
})
