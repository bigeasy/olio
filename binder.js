var Olio = require('./olio')
var assert = require('assert')
var Operation = require('operation')
var cadence = require('cadence')

function Binder (distpacher, message) {
    this._dispatcher = distpacher
    this.socket = message.socket
    this.name = message.name
    this.index = message.index
    this.count = message.count
    this.address = message.address
    this.listening = false
}

Binder.prototype.listen = cadence(function (async) {
    assert(!this.listening)
    this.listening = true
    var vargs = Array.prototype.slice.call(arguments, 1)
    this._dispatcher.Receiver = vargs[0] == null ? vargs.shift() : new Operation(vargs)
    this._dispatcher.destructible.monitor('olio', Olio, this._dispatcher, this, async())
})

module.exports = Binder
