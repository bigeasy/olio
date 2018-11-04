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
    this.messages.parent.push({ message: message.body, socket: handle })
}

Descendent.prototype._sibling = function (message, socket) {
    console.log('MADE IT!')
    this.messages.siblings.push({
        to: message.body.to,
        from: message.body.from,
        body: message.body.body,
        socket: coalesce(socket)
    })
}

Descendent.prototype.kibitz = function (address, message, handle) {
    descendent.up(address, 'olio:message', message, handle)
}

module.exports = Descendent
