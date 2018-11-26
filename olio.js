// Node.js API.
var assert = require('assert')
var events = require('events')

var Procession = require('procession')

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

var Cubbyhole = require('cubbyhole')

var Interrupt = require('interrupt').createInterrupter('olio')

var Sender = require('./sender')

var http = require('http')
var Downgrader = require('downgrader')

var delta = require('delta')

var Conduit = require('conduit')

var Staccato = require('staccato')

var Socket = require('procession/socket')(require('./hangup'))

var Turnstile = require('turnstile/redux')
var restrictor = require('restrictor')

var Keyify = require('keyify')

var events = require('events')
var util = require('util')

function Olio (destructible, dispatcher, message) {
    this.destroyed = false

    this._destructible = destructible
    this._destructible.destruct.wait(this, function () { this.destroyed = true })

    this._ready = dispatcher.ready
    this._registered = dispatcher.registered

    this.name = message.name
    this.index = message.index
    this.address = message.address
    this.socket = message.socket
    this._counts = message.counts

    this._transmitter = dispatcher.transmitter

    this.turnstile = new Turnstile
    this.turnstile.listen(destructible.monitor('turnstile'))
    destructible.destruct.wait(this.turnstile, 'destroy')

    events.EventEmitter.call(this)
}
util.inherits(Olio, events.EventEmitter)

Olio.prototype.send = restrictor.push(cadence(function (async, envelope) {
    var to = {
        name: envelope.body.shift(),
        index: envelope.body.shift()
    }
    var name = envelope.body.shift()
    var message = envelope.body.shift()
    var handle = coalesce(envelope.body.shift())
    if (envelope.canceled) {
        if (handle != null) {
            handle.destroy()
        }
    } else {
        async(function () {
            this._registered.wait(Keyify.stringify([ to.name, to.index ]), async())
        }, function (registered) {
            this._transmitter.kibitz(registered.address, {
                name: name,
                body: message
            }, coalesce(handle))
        })
    }
}))

Olio.prototype.broadcast = restrictor.push(cadence(function (async, envelope) {
    if (!envelope.canceled) {
        var to = { name: envelope.body.shift() }
        var name = envelope.body.shift()
        var message = envelope.body.shift()
        async.loop([ 0 ], function (index) {
            if (index == this._counts[to.name]) {
                return [ async.break ]
            }
            async(function () {
                this._registered.wait(Keyify.stringify([ to.name, index ]), async())
            }, function (registered) {
                this._transmitter.kibitz(registered.address, {
                    name: name,
                    body: message
                }, null)
                return index + 1
            })
        })
    }
}))

Olio.prototype.ready = cadence(function (async, name) {
    this._ready.wait(name, async())
})

Olio.prototype._createSender = cadence(function (async, destructible, Receiver, message, index) {
    async(function () {
        var request = http.request({
            socketPath: this.socket,
            url: 'http://olio/',
            headers: Downgrader.headers({
                'x-olio-to-name': message.name,
                'x-olio-to-index': index,
                'x-olio-from-name': this.name,
                'x-olio-from-index': this.index
            })
        })
        delta(async()).ee(request).on('upgrade')
        request.end()
    }, function (request, socket, head) {
        async(function () {
            var readable = new Staccato.Readable(socket)
            var writable = new Staccato.Writable(socket)
            destructible.monitor('socket', Socket, {
                label: 'sender',
                from: { name: this.name, index: this.index },
                to: { name: message.name, index: index }
            }, readable, writable, head, async())
        }, function (inbox, outbox) {
            var shifter = inbox.shifter()
            async(function () {
                destructible.monitor('receiver', Receiver, inbox, outbox, async())
            }, function (conduit) {
                async(function () {
                    shifter.dequeue(async())
                }, function (header) {
                    Interrupt.assert(header.module == 'olio' && header.method == 'connect', 'failed to start middleware')
                    Interrupt.assert(shifter.shift() == null, 'unexpected traffic on connect')
                    // Do we do this or do we register an end to pumping instead? It
                    // would depend on how we feal about ending a Conduit. I do
                    // believe it pushed out a `null` to indicate that the stream
                    // has closed. A Window would look for this and wait for
                    // restart. The Window needs to be closed explicity.
                    return [ conduit ]
                })
            })
        })
    })
})

Olio.prototype.sender = cadence(function (async, name) {
    var vargs = Array.prototype.slice.call(arguments, 2)
    async(function () {
        this.ready(name, async())
    }, function (sibling) {
        var i = 0, receivers = []
        async(function () {
            async.loop([], function () {
                if (i == sibling.count) {
                    return [ async.break ]
                }
                // TODO `message.name` instead.
                this._destructible.monitor([ 'created', sibling.name, i ], this, '_createSender', vargs, sibling, i, async())
            }, function (receiver) {
                receivers[i++] = receiver
            })
        }, function () {
            return new Sender(receivers, sibling.addresses, sibling.count)
        })
    })
})

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

module.exports = cadence(function (async, destructible, dispatcher, message) {
    return new Olio(destructible, dispatcher, message)
})
