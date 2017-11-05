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

var Operation = require('operation/variadic')

// Exceptions that you can catch by type.
var interrupt = require('interrupt').createInterrupter('subordinate')

var Monitor = require('./monitor')

function Listener (descendent, socketPath) {
    this._destructible = new Destructible(4000, 'olio/listener')
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._descendent = descendent

    this._socketPath = socketPath
    this._children = []

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
    var key = Keyify.stringify(message.to.argv)
    this._children[key].child.send(message, socket)
}

Listener.prototype.index = cadence(function (async) {
    return 'Olio Listener API\n'
})

Listener.prototype._created = function (count, argv, child) {
    var keyified = Keyify.stringify(argv)
    this._children[keyified] = { count: count, argv: argv, child: child }
    for (var key in this._children) {
        var sibling = this._children[key]
        if (keyified != key) {
            sibling.child.send({
                module: 'olio',
                method: 'created',
                socketPath: this._socketPath,
                to: null,
                count: count,
                argv: argv
            })
        }
        child.send({
            module: 'olio',
            method: 'created',
            socketPath: this._socketPath,
            to: null,
            count: sibling.count,
            argv: sibling.argv
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
            var key = Keyify.stringify(body.argv)
            var child = this._children[key] = spawn('node', [
                path.join(__dirname, 'serve.child.js'),
                '--workers', body.parameters.workers
            ].concat(body.argv), { stdio: [ 0, 1, 2, 'ipc' ] })
            this._descendent.addChild(child, null)
            this._created(+body.parameters.workers, body.argv, child)
            this._destructible.addDestructor([ 'serve', body.argv ], child, 'kill')
            Monitor(interrupt, this, child, this._destructible.monitor([ 'serve', body.argv ]))
            break
        case 'run':
            var runner = new Runner({
                descendent: this._descendent,
                process: process,
                workers: body.parameters.workers,
                argv: body.argv
            })
            this._destructible.addDestructor([ 'run', body.argv ], runner, 'destroy')
            runner.run(this._destructible.monitor([ 'run', body.argv ]))
            this._created(+body.parameters.workers, body.argv, runner)
            break
        }
    }, this)
}

Listener.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Listener
