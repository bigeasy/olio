var Procession = require('procession')

function Transmitter (supervisor, name, index) {
    this._name = name
    this._index = index
    this.messages = { parent: new Procession, siblings: new Procession }
    this._supervisor = supervisor
}

Transmitter.prototype.register = function () {
    this._supervisor.register(this._name, this._index)
}

Transmitter.prototype.ready = function () {
    this._supervisor.ready(this._name, this._index)
}

Transmitter.prototype.kibitz = function (address, message, handle) {
    this._supervisor.kibitz(address,  message, handle)
}

module.exports = Transmitter
