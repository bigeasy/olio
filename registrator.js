const coalesce = require('extant')
const Cubbyhole = require('cubbyhole')

class Registrator {
    constructor (sender, program, configuration) {
        this._sender = sender
        this.constituents = {}
        this._socket = configuration.socket,
        this._count = 0
        this._registered = 0
        this.created = new Cubbyhole
        for (const name in configuration.constituents) {
            const constituent = configuration.constituents[name]
            const workers = coalesce(constituent.workers, 1)
            this._count += workers
            const addresses = []
            for (let i = 0; i < workers; i++) {
                addresses.push(null)
            }
            const source = constituent.module ? {
                module: constituent.module
            } : {
                path: constituent.path
            }
            this.constituents[name] = {
                source: source,
                program: program,
                name: name,
                registered: 0,
                ready: 0,
                count: workers,
                properties: constituent.properties,
                addresses: addresses
            }
        }
    }

    // Registered lets us know that the constituent is ready to receive IPC
    // messages. We wait for all constituents to be registered before proceding
    // with initialization.
    //
    // Ready let's us know that the constituent registered a listener.
    register (name, index, path) {
        const constituent = this.constituents[name]
        constituent.registered++
        constituent.addresses[index] = coalesce(path)
        const siblings = {}
        for (const name in this.constituents) {
            siblings[name] = {
                properties: JSON.parse(JSON.stringify(this.constituents[name].properties)),
                count: this.constituents[name].count
            }
        }
        this._sender.send(constituent.addresses[index], {
            method: 'initialize',
            socket: this._socket,
            program: constituent.program,
            name: constituent.name,
            source: constituent.source,
            index: index,
            properties: constituent.properties,
            address: constituent.addresses[index],
            count: constituent.count,
            siblings: siblings
        })
        for (const name in this.constituents) {
            const sibling = this.constituents[name]
            sibling.addresses.forEach(function (address, i) {
                if (address != null) {
                    this._sender.send(address, {
                        method: 'registered',
                        name: constituent.name,
                        index: index,
                        address: constituent.addresses[index],
                        count: constituent.count
                    })
                    if (!(sibling.name == constituent.name && i == index)) {
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
            if (
                constituent.registered == constituent.count &&
                sibling.ready == sibling.count
            ) {
                for (let i = 0; i < constituent.count; i++) {
                    this._sender.send(constituent.addresses[i], {
                        method: 'created',
                        name: sibling.name,
                        addresses: sibling.addresses,
                        count: sibling.count
                    })
                }
            }
        }
    }

    ready (name) {
        const constituent = this.constituents[name]
        if (++constituent.ready != constituent.count) {
            return
        }
        this.created.set(constituent.name, true)
        for (const name in this.constituents) {
            const sibling = this.constituents[name]
            if (sibling.registered == sibling.count) {
                for (let i = 0; i < sibling.count; i++) {
                    this._sender.send(sibling.addresses[i], {
                        method: 'created',
                        name: constituent.name,
                        addresses: constituent.addresses,
                        count: constituent.count
                    })
                }
            }
        }
    }
}

module.exports = Registrator
