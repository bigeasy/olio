// Node.js API.
var assert = require('assert')
var events = require('events')

var Procession = require('procession')

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

var Cubbyhole = require('cubbyhole')

var Interrupt = require('interrupt').createInterrupter('olio')

var Sender = require('./sender')

var http = require('http')
var Downgrader = require('downgrader')

var delta = require('delta')

var Conduit = require('conduit')

function Olio (destructible, dispatcher, binder) {
    this.destroyed = false

    this._destructible = destructible
    this._destructible.destruct.wait(this, function () { this.destroyed = true })

    this._siblings = dispatcher.siblings

    this.name = binder.name
    this.index = binder.index
    this.address = binder.address
    this.socket = binder.socket

    this.messages = dispatcher.transmitter.messages.siblings

    this._transmitter = dispatcher.transmitter
    this._transmitter.ready()
}

Olio.prototype.send = cadence(function (async, name, index, message, handle) {
    async(function () {
        console.log(name)
        this.sibling(name, async())
    }, function (sibling) {
        console.log(sibling, name)
        this._transmitter.kibitz(sibling.addresses[index], {
            to: { name: name, index: index },
            from: { name: this.name, index: this.index },
            body: message
        }, coalesce(handle))
    })
})

Olio.prototype.broadcast = cadence(function (async, name, message) {
    async(function () {
        this.sibling(name, async())
    }, function (sibling) {
        sibling.addresses.forEach(function (address, index) {
            this._transmitter.kibitz(address, {
                to: { name: sibling.name, index: index },
                from: { name: this.name, index: this.index },
                body: message
            }, null)
        }, this)
    })
})

Olio.prototype.sibling = cadence(function (async, name) {
    this._siblings.wait(name, async())
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
            destructible.monitor('receiver', Receiver, index, async())
        }, function (receiver) {
            var sip = {
                outbox: receiver.outbox,
                inbox: new Procession
            }
            var shifter = sip.inbox.shifter()
            async(function () {
                destructible.monitor('conduit', Conduit, sip, socket, socket, head, async())
            }, function (conduit) {
                async(function () {
                    shifter.dequeue(async())
                }, function (header) {
                    Interrupt.assert(header.module == 'olio' && header.method == 'connect', 'failed to start middleware')
                    Interrupt.assert(shifter.shift() == null, 'unexpected traffic on connect')
                    conduit.receiver = receiver
                    // Do we do this or do we register an end to pumping instead? It
                    // would depend on how we feal about ending a Conduit. I do
                    // believe it pushed out a `null` to indicate that the stream
                    // has closed. A Window would look for this and wait for
                    // restart. The Window needs to be closed explicity.
                })
            }, function() {
                return [ receiver ]
            })
        })
    })
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
                this._destructible.monitor([ 'created', sibling.name, i ], this, '_createSender', Receiver, sibling, i, async())
            }, function (receiver) {
                receivers[i++] = receiver
            })()
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

module.exports = cadence(function (async, destructible, dispatcher, binder) {
    return new Olio(destructible, dispatcher, binder)
})
