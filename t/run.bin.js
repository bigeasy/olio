var cadence = require('cadence')
var Conduit = require('conduit/conduit')

function Run (olio) {
    this._olio = olio
}

Run.prototype.connect = cadence(function (async, destructible, inbox, outbox) {
    destructible.monitor('conduit', Conduit, inbox, outbox, cadence(function (async, request, inbox, outbox) {
        return [ 1 ]
    }), async())
})

Run.prototype.message = cadence(function (async, envelope) {
    console.log('!', envelope)
    if (envelope.body.method == 'send') {
        this._olio.broadcast('serve', { method: 'broadcast', sequence: envelope.body.sequence }, async())
    }
})

Run.prototype.reconfigure = cadence(function () {
    // TODO Someday.
})

// TODO No, we do not wait for all message to complete before exit, we just
// exit, that's where we're at. Or maybe, it is always the client that hangs up
// on the server and we're bi-directional then all the hangups will wind down a
// multiplexer.

// TODO Looks like you are getting ever more liberal with your use of
// `Destructible`. The wrapper will need to know how to handle incoming
// requests, so it needs a `receiver` function. If the child is going to call
// itself, then it needs to wait for the wrapper to get the `receiver` before it
// can create a sender on itself. We kind of had this apparent when Olio was
// constructed with a listener builder as an argument if it was going to be a
// server. Could pass in a builder.
module.exports = cadence(function (async, destructible, olio) {
    return new Run(olio)
})
