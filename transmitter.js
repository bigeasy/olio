var Procession = require('procession')

function Transmitter (supervisor, name, index) {
    this._name = name
    this._index = index
    this._supervisor = supervisor
}

Transmitter.prototype.destroy = function () {
    this._supervisor.unregister(this._name, this._index)
}

Transmitter.prototype.register = function (messages) {
    this._supervisor.register(this._name, this._index, messages)
}

Transmitter.prototype.ready = function () {
    this._supervisor.ready(this._name, this._index)
}

Transmitter.prototype.send = function (sibling, index, message, handle) {
    this._supervisor.send(this._name, this._index, sibling, message, handle)
}

Transmitter.prototype.broadcast = function (sibling, message) {
    this._supervisor.broadcast(this._name, this._index, sibling, message)
}

module.exports = Transmitter
