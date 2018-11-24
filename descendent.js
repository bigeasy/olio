var descendent = require('foremost')('descendent')
var Procession = require('procession')
var coalesce = require('extant')

function Descendent () {
    descendent.increment()
    this.messages = { parent: new Procession, siblings: new Procession }
    this._listeners = { parent: this._child.bind(this), sibling: this._sibling.bind(this) }
    descendent.across('olio:mock', {})
    // TODO Rename `olio:parent` and `olio:sibling`.
    descendent.on('olio:operate', this._listeners.parent)
    descendent.on('olio:message', this._listeners.sibling)
}

Descendent.prototype.destroy = function () {
    descendent.removeListener('olio:operate', this._listeners.parent)
    descendent.removeListener('olio:message', this._listeners.sibling)
    descendent.decrement()
}

Descendent.prototype.register = function () {
    descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})
}

Descendent.prototype.ready = function () {
    descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})
}

Descendent.prototype._child = function (message, handle) {
    this.dispatcher.fromParent(message.body, handle)
}

Descendent.prototype._sibling = function (message, handle) {
    this.dispatcher.fromSibling(message.body, handle)
}

Descendent.prototype.kibitz = function (address, message, handle) {
    descendent.up(address, 'olio:message', message, handle)
}

module.exports = Descendent
