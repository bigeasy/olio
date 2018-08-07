// Node.js API.
var path = require('path')

// Control-flow utilities.
var delta = require('delta')
var cadence = require('cadence')

var Reactor = require('reactor')
var Runner = require('./runner')
var spawn = require('child_process').spawn

var Destructible = require('destructible')
var Keyify = require('keyify')

var Descendent = require('descendent')

// Exceptions that you can catch by type.
var interrupt = require('interrupt').createInterrupter('subordinate')

var Monitor = require('./monitor')

var Operation = require('operation')

function Listener (destructible, descendent, socketPath) {
    this._destructible = destructible
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._descendent = descendent

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
    this._descendent.down(path, 'olio:message', message, socket)
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
            // TODO Shouldn't count go down now with initialization?
            this._descendent.down(path, 'olio:message', {
                method: 'initialize',
                name: name,
                argv: child.argv,
                index: index
            })
        }, this)
        child.paths.forEach(function (path, index) {
            this._descendent.down(path, 'olio:message', {
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
                this._descendent.down(path, 'olio:message', {
                    method: 'created',
                    socketPath: this._socketPath,
                    name: message.cookie.name,
                    count: child.count,
                    argv: child.argv
                })
            }, this)
        }
    }
}

Listener.prototype.children = cadence(function (async, children) {
    async.forEach(function (body) {
        switch (body.method) {
        case 'serve':
            var child = spawn('node', [
                path.join(__dirname, 'serve.child.js'),
                '--name', body.parameters.name,
                '--workers', body.parameters.workers
            ].concat(body.argv), { stdio: [ 0, 1, 2, 'ipc' ] })
            this._descendent.addChild(child, null)
            this._created(+body.parameters.workers, body.parameters.name, body.argv, [ child.pid ])
            this._destructible.destruct.wait(child, 'kill')
            Monitor(interrupt, this, child, this._destructible.monitor([ 'serve', body.argv ]))
            break
        case 'run':
            async(function () {
                this._destructible.monitor([ 'run', body.parameters.name ], Runner, {
                    descendent: this._descendent,
                    process: process,
                    workers: body.parameters.workers,
                    name: body.parameters.name,
                    argv: body.argv
                }, async())
            }, function (runner) {
                this._created(+body.parameters.workers, body.parameters.name, body.argv, runner.pids)
            })
            break
        }
    })(children)
})

module.exports = function (destructible, descendent, socketPath, callback) {
    callback(null, new Listener(destructible, descendent, socketPath))
}
