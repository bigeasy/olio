// Node.js API.
var path = require('path')

// Control-flow utilities.
var delta = require('delta')
var cadence = require('cadence')

var Reactor = require('reactor')
var spawn = require('child_process').spawn

var coalesce = require('extant')

var descendent = require('foremost')('descendent')

// Exceptions that you can catch by type.
var Interrupt = require('interrupt').createInterrupter('subordinate')

var Registrator = require('./registrator')

var Monitor = require('./monitor')

var Operation = require('operation')

var cluster = require('cluster')

function Listener (destructible, configuration) {
    this._destructible = destructible
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._registrator = new Registrator(this, configuration)

    descendent.increment()
    destructible.completed.wait(descendent, 'decrement')

    descendent.on('olio:registered', this._register.bind(this))
    descendent.on('olio:ready', this._ready.bind(this))

    this._children = {}

    this._process = process
    this._process.env.OLIO_SUPERVISOR_PROCESS_ID = process.pid

    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
    })
}

Listener.prototype.socket = function (request, socket) {
    var message = {
        module: 'olio',
        method: 'connect',
        to: {
            name: request.headers['x-olio-to-name'],
            index: +request.headers['x-olio-to-index']
        },
        from: {
            name: request.headers['x-olio-from-name'],
            index: +request.headers['x-olio-from-index']
        }
    }
    var path = this._children[message.to.name].paths[message.to.index]
    descendent.down(path, 'olio:message', message, socket)
}

Listener.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Olio Listener API\n' ]
})

Listener.prototype._created = function (count, name, properties, pids) {
    this._children[name] = {
        count: count,
        registered: 0,
        ready: 0,
        properties: properties,
        pids: pids,
        paths: []
    }
}

Listener.prototype._register = function (message) {
    var name = message.cookie.name, index = message.cookie.index
    this._registrator.register(name, index, message.from)
}

Listener.prototype.send = function (address, message, socket) {
    descendent.down(address, 'olio:operate', message, coalesce(socket))
}

Listener.prototype._ready = function (message) {
    var child = this._children[message.cookie.name]
    if (++child.ready != child.count) {
        return
    }
    for (var name in this._children) {
        var sibling = this._children[name]
        if (name != message.cookie.name) {
            sibling.paths.forEach(function (path, index) {
                descendent.down(path, 'olio:message', {
                    method: 'created',
                    socketPath: this._socketPath,
                    name: message.cookie.name,
                    paths: child.paths,
                    count: child.count,
                    argv: child.argv
                })
            }, this)
        }
    }
}

Listener.prototype.spawn = cadence(function (async, configuration) {
        console.log('--- xxx ---')
    var executable = path.join(__dirname, 'child.js')
    for (var name in configuration.children) {
        var config = configuration.children[name]
        // TODO Set Node.js arguments.
        cluster.setupMaster({ exec: executable, args: [] })
        var workers = coalesce(config.workers, 1)
        var pids = []
        for (var i = 0; i < workers; i++) {
            var worker = cluster.fork({ OLIO_WORKER_INDEX: i })
            this._destructible.destruct.wait(worker, 'kill')
            descendent.addChild(worker.process, {
                name: name,
                properties: worker.properties,
                index: i
            })
            pids.push(worker.process.pid)
            Monitor(Interrupt, this, worker.process, this._destructible.monitor([ 'child', name, i ]))
        }
        this._created(workers, name, worker.properties, pids)
    }
})

module.exports = cadence(function (async, destructible, configuration) {
    return new Listener(destructible, configuration)
})
