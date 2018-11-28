// Node.js API.
var path = require('path')
var http = require('http')

// Control-flow utilities.
var delta = require('delta')
var cadence = require('cadence')

var Resolve = require('./resolve')

var Reactor = require('reactor')
var spawn = require('child_process').spawn

var Olio = require('./olio')

var coalesce = require('extant')

var Dispatcher = require('./dispatcher')

// Exceptions that you can catch by type.
var Interrupt = require('interrupt').createInterrupter('subordinate')

var Monitor = require('./monitor')

var Registrator = require('./registrator')

var delta = require('delta')

var Downgrader = require('downgrader')

function Mock (destructible, configuration) {
    this._destructible = destructible
    this._children = {}
    this._registrator = new Registrator(this, configuration)
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
    })
}

Mock.prototype.socket = function (request, socket) {
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
    this.send({ name: message.to.name, index: message.to.index }, message, socket)
}

Mock.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Olio Mock API\n' ]
})

Mock.prototype.send = function (address, message, socket) {
    this._children[address.name][address.index].transmitter.fromParent(message, coalesce(socket))
}

Mock.prototype.kibitz = function (address, message, socket) {
    this._children[address.name][address.index].transmitter.fromSibling(message, socket)
}

Mock.prototype._spawn = cadence(function (async, destructible, spawn) {
    this._children[spawn.name][spawn.index] = { transmitter: null }
    async(function () {
        setImmediate(async())
    }, function () {
        destructible.monitor('dispatcher', Dispatcher, this, async())
    }, function (dispatcher) {
        this._children[spawn.name][spawn.index] = { transmitter: dispatcher }
        this._registrator.register(spawn.name, spawn.index, { name: spawn.name, index: spawn.index })
        async(function () {
            dispatcher.olio.wait(async())
        }, function (olio, properties) {
            async(function () {
                destructible.monitor([ 'child' ], spawn.Child, olio, properties, async())
            }, function (child) {
                dispatcher.receiver = child
                spawn.created[spawn.name][spawn.index] = coalesce(child)
                this._registrator.ready(spawn.name)
            })
        })
    })
})

Mock.prototype.spawn = cadence(function (async, destructible, configuration, created) {
    for (var name in configuration.children) {
        var config = configuration.children[name]
        var workers = coalesce(config.workers, 1)
        this._children[name] = []
        created[name] = []
        var index = 0
        var Child = Resolve(config, require)
        for (var index = 0; index < workers; index++) {
            this._destructible.monitor([ 'child', name, index ], this, '_spawn', {
                Child: Child,
                name: name,
                index: index,
                created: created,
            }, destructible.monitor({ name: name, index: index }, true))
        }
    }
    destructible.completed.wait(async().bind(null, null))
})

module.exports = cadence(function (async, destructible, configuration) {
    var listener = new Mock(destructible, configuration), created = {}
    async(function () {
        var downgrader = new Downgrader
        downgrader.on('socket', listener.socket.bind(listener))

        var server = http.createServer(listener.reactor.middleware)
        server.on('upgrade', downgrader.upgrade.bind(downgrader))

        destructible.destruct.wait(server, 'close')

        server.unref()

        server.listen(configuration.socket)

        delta(async()).ee(server).on('listening')
    }, function () {
        destructible.monitor('spawn', true, listener, 'spawn', configuration, created, async())
    }, function () {
        return created
    })
})
