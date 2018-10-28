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

var Monitor = require('./monitor')

var Operation = require('operation')

var cluster = require('cluster')

function Listener (destructible, socketPath) {
    this._destructible = destructible
    this._destructible.markDestroyed(this)
    this.destroyed = false

    descendent.increment()
    destructible.completed.wait(descendent, 'decrement')

    descendent.on('olio:registered', this._registered.bind(this))
    descendent.on('olio:ready', this._ready.bind(this))

    this._socketPath = socketPath
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

Listener.prototype._created = function (count, name, argv, pids) {
    this._children[name] = {
        count: count,
        registered: 0,
        ready: 0,
        argv: argv,
        pids: pids,
        paths: []
    }
}

Listener.prototype._registered = function (message) {
    var child = this._children[message.cookie.name]
    child.registered++
    child.paths[message.cookie.index] = message.from
    if (child.registered != child.count) {
        return
    }
    for (var name in this._children) {
        var child = this._children[name]
        if (child.registered != child.count) {
            return
        }
    }
    for (var name in this._children) {
        child = this._children[name]
        child.paths.forEach(function (path, index) {
            console.log('INITIALIZED', name, path, message, child)
            // TODO Shouldn't count go down now with initialization?
            descendent.down(path, 'olio:message', {
                method: 'initialize',
                name: name,
                argv: child.argv,
                index: index,
                path: child.paths[child.index],
                count: child.count
            })
        }, this)
        child.paths.forEach(function (path, index) {
            console.log('CREATED')
            descendent.down(path, 'olio:message', {
                method: 'created',
                socketPath: this._socketPath,
                argv: child.argv,
                name: name,
                paths: child.paths,
                count: child.count
            })
        }, this)
    }
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

Listener.prototype.children = cadence(function (async, children) {
    async.forEach(function (body) {
        var workers = +coalesce(body.parameters.workers, 1)
        switch (body.method) {
        case 'serve':
        case 'run':
            cluster.setupMaster({ exec: body.argv[0], args: body.argv.slice(1) })
            var pids = []
            for (var i = 0; i < workers; i++) {
                var worker = cluster.fork({ OLIO_WORKER_INDEX: i })
                this._destructible.destruct.wait(worker, 'kill')
                descendent.addChild(worker.process, {
                    name: body.parameters.name,
                    argv: body.argv,
                    index: i
                })
                pids.push(worker.process.pid)
                Monitor(Interrupt, this, worker.process, this._destructible.monitor([ 'child', body.argv, i ]))
            }
            this._created(workers, body.parameters.name, body.argv, pids)
            break
        }
    })(children)
})

module.exports = function (destructible, socketPath, callback) {
    callback(null, new Listener(destructible, socketPath))
}
