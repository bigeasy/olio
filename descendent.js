var descendent = require('foremost')('descendent')
var Procession = require('procession')
var coalesce = require('extant')

function Descendent () {
    descendent.increment()
    this.messages = { parent: new Procession, siblings: new Procession }
    this._listeners = { parent: this._child.bind(this), sibling: this._sibling.bind(this) }
    descendent.across('olio:mock', {})
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
    console.log(message, handle)
    this.messages.parent.push({ message: message.body, handle: handle })
}

Descendent.prototype._sibling = function (message, handle) {
    this.messages.sibling.push({ message: message, handle: handle })
}

Descendent.prototype.send = function (sibling, index, message, handle) {
    descendent.up(sibling.paths[index], 'olio:message', message, handle)
}

Descendent.prototype.broadcast = function (sibling, message) {
    sibling.paths.forEach(function (path) {
        descendent.up(sibling.paths[index], 'olio:message', message)
    })
}

module.exports = Descendent
