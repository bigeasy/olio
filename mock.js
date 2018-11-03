// Node.js API.
var path = require('path')

// Control-flow utilities.
var delta = require('delta')
var cadence = require('cadence')

var Resolve = require('./resolve')
var Transmitter = require('./transmitter')

var Reactor = require('reactor')
var spawn = require('child_process').spawn

var Olio = require('./olio')

var coalesce = require('extant')

var Dispatcher = require('./dispatcher')

var descendent = require('foremost')('descendent')

// Exceptions that you can catch by type.
var Interrupt = require('interrupt').createInterrupter('subordinate')

var Monitor = require('./monitor')

var Operation = require('operation')

var Registrator = require('./registrator')

var delta = require('delta')

function Mock (destructible, configuration) {
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
    console.log('socket to me!', message)
    this.send({ name: message.to.name, index: message.to.index }, message, socket)
}

Mock.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Olio Mock API\n' ]
})

Mock.prototype.send = function (address, message, socket) {
    this._children[address.name][address.index].messages.parent.push({ message: message, socket: coalesce(socket) })
}

Mock.prototype.register = function (name, index, messages) {
    this._children[name][index] = { messages: messages }
    this._registrator.register(name, index, { name: name, index: index })
}

Mock.prototype.ready = function (name, index) {
    this._registrator.ready(name)
}

Mock.prototype.spawn = cadence(function (async, destructible, configuration, created) {
    async.forEach(function (name) {
        var config = configuration.children[name]
        var workers = coalesce(config.workers, 1)
        this._children[name] = []
        var index = 0
        var Child = Resolve(config, require)
        var loop = async(function () {
            if (index == workers) {
                return [ loop.break ]
            }
            var transmitter = new Transmitter(this, name, index)
            async(function () {
                destructible.monitor('dispatcher', Dispatcher, transmitter, async())
            }, function (binder, configuration) {
                destructible.monitor([ 'child', binder.name, binder.index ], Child, binder, configuration, async())
            }, function (child) {
                console.log('GHILD', child)
                created[index++] = coalesce(child)
            })
        })()
    })(Object.keys(configuration.children))
})

var http = require('http')
var Downgrader = require('downgrader')

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
        listener.spawn(destructible, configuration, created, async())
    }, function () {
        return created
    })
})
