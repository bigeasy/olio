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
var Descend = require('./descend')

var Operation = require('operation')

function Listener (descendent, socketPath) {
    this._destructible = new Destructible(4000, 'olio/listener')
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._descendent = descendent

    descendent.on('olio:registered', this._registered.bind(this))
    descendent.on('olio:ready', this._ready.bind(this))

    this._socketPath = socketPath
    this._children = {}

    this._process = process

    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
    })
}

Listener.prototype.socket = function (request, socket) {
    var message = {
        module: 'olio',
        method: 'connect',
        to: {
            index: +request.headers['x-olio-to-index'],
            argv: JSON.parse(request.headers['x-olio-to-argv'])
        },
        from: {
            index: +request.headers['x-olio-from-index'],
            argv: JSON.parse(request.headers['x-olio-from-argv'])
        }
    }
    this._children[Keyify.stringify(message.to.argv)].descend.call(null, message, socket)
}

Listener.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Olio Listener API\n' ]
})

Listener.prototype._created = function (count, argv, pids) {
    var keyified = Keyify.stringify(argv)
    this._children[keyified] = {
        count: count,
        registered: 0,
        ready: 0,
        argv: argv,
        pids: pids,
        paths: [],
        // TODO WHy closuer?
        descend: Descend(this._descendent, pids)
    }
}

Listener.prototype._registered = function (message) {
    var keyified = Keyify.stringify(message.cookie.argv)
    var child = this._children[keyified]
    child.registered++
    child.paths[message.cookie.index] = message.path
    if (child.registered != child.count) {
        return
    }
    for (var keyified in this._children) {
        var child = this._children[keyified]
        if (child.registered != child.count) {
            return
        }
    }
    for (var keyified in this._children) {
        child = this._children[keyified]
        child.paths.forEach(function (path, index) {
            this._descendent.down(path, 'olio:message', {
                method: 'initialize',
                argv: child.argv,
                index: index
            })
        }, this)
    }
}

Listener.prototype._ready = function (message) {
    var keyified = Keyify.stringify(message.cookie.argv)
    var child = this._children[keyified]
    if (++child.ready != child.count) {
        return
    }
    for (var key in this._children) {
        var sibling = this._children[key]
        sibling.descend.call(null, {
            body: {
                method: 'created',
                socketPath: this._socketPath,
                to: null,
                count: child.count,
                argv: child.argv
            }
        })
    }
}

Listener.prototype.listen = function (callback) {
    this._destructible.completed.wait(callback)
}

Listener.prototype.children = function (children) {
    children.forEach(function (body) {
        switch (body.method) {
        case 'serve':
            var child = spawn('node', [
                path.join(__dirname, 'serve.child.js'),
                '--workers', body.parameters.workers
            ].concat(body.argv), { stdio: [ 0, 1, 2, 'ipc' ] })
            this._descendent.addChild(child, null)
            this._created(+body.parameters.workers, body.argv, [ child.pid ])
            this._destructible.destruct.wait(child, 'kill')
            Monitor(interrupt, this, child, this._destructible.monitor([ 'serve', body.argv ]))
            break
        case 'run':
            var runner = new Runner({
                descendent: this._descendent,
                process: process,
                workers: body.parameters.workers,
                argv: body.argv
            })
            this._destructible.destruct.wait(runner, 'destroy')
            runner.run(this._destructible.monitor([ 'run', body.argv ]))
            this._created(+body.parameters.workers, body.argv, runner.pids)
            break
        }
    }, this)
}

Listener.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Listener
