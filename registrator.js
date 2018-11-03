var coalesce = require('extant')

function Registrator (sender, configuration) {
    this._sender = sender
    this.children = {}
    this._socket = configuration.socket,
    this._count = 0
    this._registered = 0
    for (var name in configuration.children) {
        var child = configuration.children[name]
        var workers = coalesce(child.workers, 1)
        this._count += workers
        this.children[name] = {
            name: name,
            registered: 0,
            ready: 0,
            count: workers,
            properties: child.properties,
            addresses: []
        }
    }
}

// Registered lets us know that the child is ready to receive IPC messages. We
// wait for all children to be registered before proceding with initialization.
//
// Ready let's us know that the child registered a listener.
Registrator.prototype.register = function (name, index, path) {
    var child = this.children[name]
    child.registered++
    child.addresses[index] = coalesce(path)
    this._sender.send(child.addresses[index], {
        method: 'initialize',
        socket: this._socket,
        name: child.name,
        index: index,
        properties: child.properties,
        address: child.addresses[index],
        count: child.count
    })
    for (var name in this.children) {
        var sibling = this.children[name]
        if (sibling.ready == sibling.count) {
            for (var i = 0; i < child.count; i++) {
                this._sender.send(child.addresses[i], {
                    method: 'created',
                    name: sibling.name,
                    addresses: sibling.addresses,
                    count: sibling.count
                })
            }
        }
    }
}

Registrator.prototype.ready = function (name) {
    var child = this.children[name]
    if (++child.ready != child.count) {
        return
    }
    for (var name in this.children) {
        var sibling = this.children[name]
        if (sibling.registered == sibling.count) {
            for (var i = 0; i < sibling.count; i++) {
                this._sender.send(sibling.addresses[i], {
                    method: 'created',
                    name: child.name,
                    addresses: child.addresses,
                    count: child.count
                })
            }
        }
    }
}

module.exports = Registrator
