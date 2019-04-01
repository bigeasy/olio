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

var Registrator = require('./registrator')

var delta = require('delta')

var Downgrader = require('downgrader')

function Mock (destructible, configuration) {
    this._destructible = destructible
    this._dispatchers = { program: [{}] }
    this.reactor = new Reactor(this, function (dispatcher) {
        dispatcher.dispatch('GET /', 'index')
    })
}

Mock.prototype.socket = function (request, socket) {
    var message = {
        module: 'olio',
        method: 'connect',
        program: {
            name: request.headers['x-olio-program-name'],
            index: +request.headers['x-olio-program-index']
        },
        to: {
            name: request.headers['x-olio-to-name'],
            index: +request.headers['x-olio-to-index']
        },
        from: {
            name: request.headers['x-olio-from-name'],
            index: +request.headers['x-olio-from-index']
        }
    }
    require('assert')(message.program.name)
    this.send({ program: message.program, name: message.to.name, index: message.to.index }, message, socket)
}

Mock.prototype.index = cadence(function (async) {
    return [ 200, { 'content-type': 'text/plain' }, 'Olio Mock API\n' ]
})

Mock.prototype.send = function (address, message, socket) {
    this._dispatchers[address.program.name][address.program.index][address.name][address.index].fromParent(message, coalesce(socket))
}

Mock.prototype.kibitz = function (address, message, socket) {
    this._dispatchers[address.program.name][address.program.index][address.name][address.index].fromSibling(message, socket)
}

Mock.prototype._spawn = cadence(function (async, destructible, registrator, address) {
    async(function () {
        setImmediate(async())
    }, function () {
        destructible.durable('dispatcher', Dispatcher, this, async())
    }, function (dispatcher) {
        this._dispatchers[address.program.name][address.program.index][address.name][address.index] = dispatcher
        registrator.register(address.name, address.index, address)
        async(function () {
            dispatcher.olio.wait(async())
        }, function (olio, source, properties) {
            var Child = Resolve(source, require)
            async(function () {
                destructible.durable([ 'child' ], Child, olio, properties, async())
            }, function (child) {
                dispatcher.receiver = child
                registrator.ready(address.name)
            })
        })
    })
})

// I don't mind if the startup hangs. I'm not going to time it out for the user.
// Just so long a hung startup pretty obviously means some sort of user deadlock
// and not that an error has been raised but the constituents have not been
// notified. An error will cause us to destroy our `Destructible` tree which
// ought to take down our dear user's provided constituents.

// Note that while we can use a `Destructible` to catch initialization errors as
// we do here, we cannot use `Destructible` as a countdown latch. We use our
// constructor monitoring `Destructible` with monitor callbacks that can
// terminate. When they all terminate the destructible is still valid, possibly
// expecting to be asked to create more monitor callbacks that can terminate as
// it would if it where a server.

//
Mock.prototype.spawn = cadence(function (async, forgivable, durable, configuration) {
    var created = {}
    var registrator = new Registrator(this, { name: 'program', index: 0 }, configuration)
    for (var name in configuration.constituents) {
        created[name] = []
        this._dispatchers.program[0][name] = []
        for (var i = 0, I = coalesce(configuration.constituents[name].workers, 1); i < I; i++) {
            var address = { program: { name: 'program', index: 0 }, name: name, index: i }
            cadence(function (async, address) {
                async(function () {
                    durable.durable([ 'constituent', address ], this, '_spawn', registrator, address, async())
                }, function (child) {
                    created[address.name][address.index] = child
                })
            }).call(this, address, forgivable.ephemeral([ address ]))
        }
    }
    forgivable.drain()

    // We can't `forgivable.completed.wait` here because the `forgivable` would
    // be waiting for it's own constructor to complete. We'll return the
    // `forgivable` and wait for on the other side of this constructor
    // invocation.

    //
    return [ created, forgivable ]
})

module.exports = cadence(function (async, destructible, configuration) {
    var mock = new Mock(destructible, configuration), created = {}
    async(function () {
        var downgrader = new Downgrader
        downgrader.on('socket', mock.socket.bind(mock))

        var server = http.createServer(mock.reactor.middleware)
        server.on('upgrade', downgrader.upgrade.bind(downgrader))

        destructible.destruct.wait(server, 'close')

        server.unref()

        server.listen(configuration.socket)

        delta(async()).ee(server).on('listening')
    }, function () {
        destructible.ephemeral('spawn', mock, 'spawn', destructible, configuration, async())
    }, function (created, countdown) {
        async(function () {
            countdown.completed.wait(async())
        }, function () {
            return [ created ]
        })
    })
})
