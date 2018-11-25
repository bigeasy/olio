var coalesce = require('extant')

function Registrator (sender, configuration) {
    this._sender = sender
    this.children = {}
    this._socket = configuration.socket,
    this._count = 0
    this._registered = 0
    var counts = {}
    for (var name in configuration.children) {
        var child = configuration.children[name]
        var workers = coalesce(child.workers, 1)
        this._count += workers
        var addresses = []
        for (var i = 0; i < workers; i++) {
            addresses.push(null)
        }
        this.children[name] = {
            name: name,
            registered: 0,
            ready: 0,
            count: workers,
            properties: child.properties,
            addresses: addresses
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
    var counts = {}
    for (var name in this.children) {
        counts[name] = this.children[name].count
    }
    this._sender.send(child.addresses[index], {
        method: 'initialize',
        socket: this._socket,
        name: child.name,
        index: index,
        properties: child.properties,
        address: child.addresses[index],
        count: child.count,
        counts: counts
    })
    for (var name in this.children) {
        var sibling = this.children[name]
        sibling.addresses.forEach(function (address, i) {
            if (address != null) {
                this._sender.send(address, {
                    method: 'registered',
                    name: child.name,
                    index: index,
                    address: child.addresses[index],
                    count: child.count
                })
                if (!(sibling.name == child.name && i == index)) {
                    this._sender.send(path, {
                        method: 'registered',
                        name: sibling.name,
                        index: i,
                        address: sibling.addresses[i],
                        count: sibling.count
                    })
                }
            }
        }, this)
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
