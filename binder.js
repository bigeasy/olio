var Olio = require('./olio')
var assert = require('assert')
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
    this._dispatcher.Receiver = Array.prototype.slice.call(arguments, 1)
    this._dispatcher.destructible.monitor('olio', Olio, this._dispatcher, this, async())
})

module.exports = Binder
