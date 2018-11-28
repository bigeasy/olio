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

var Sequester = require('sequester')

function Mock (destructible, configuration) {
    this._destructible = destructible
    this._dispatchers = {}
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
    this._dispatchers[address.name][address.index].fromParent(message, coalesce(socket))
}

Mock.prototype.kibitz = function (address, message, socket) {
    this._dispatchers[address.name][address.index].fromSibling(message, socket)
}

Mock.prototype._spawn = cadence(function (async, destructible, address) {
    async(function () {
        setImmediate(async())
    }, function () {
        destructible.durable('dispatcher', Dispatcher, this, async())
    }, function (dispatcher) {
        this._dispatchers[address.name][address.index] = dispatcher
        this._registrator.register(address.name, address.index, address)
        async(function () {
            dispatcher.olio.wait(async())
        }, function (olio, source, properties) {
            var Child = Resolve(source, require)
            async(function () {
                destructible.durable([ 'child' ], Child, olio, properties, async())
            }, function (child) {
                dispatcher.receiver = child
                this._registrator.ready(address.name)
            })
        })
    })
})

// I don't mind if the startup hangs. I'm not going to time it out for the user.
// Just so long a hung startup pretty obviously means some sort of user deadlock
// and not that an error has been raised but the children have not been
// notified. An error will cause us to destroy our `Destructible` tree which
// ought to take down our dear user's provided children. When running the
// executable the children are going to get a `SIGTERM` and the `Destructible`
// in `child.js` will be destroyed.

// Note that while we can use a `Destructible` to catch initialization errors as
// we do here, we cannot use `Destructible` as a countdown latch. We use our
// constructor monitoring `Destructible` with monitor callbacks that can
// terminate. When they all terminate the destructible is still valid, possibly
// expecting to be asked to create more monitor callbacks that can terminate as
// it would if it where a server.
//
// Thus, we use the not often used `Sequester` object to create a countdown
// latch.

//
Mock.prototype.spawn = cadence(function (async, configuration) {
    var created = {}
    var countdown = Sequester.createLock()
    countdown.share(function () {})
    for (var name in configuration.children) {
        this._dispatchers[name] = []
        created[name] = []
        for (var i = 0, I = coalesce(configuration.children[name].workers, 1); i < I; i++) {
            countdown.share(function () {})
            var address = { name: name, index: i }
            cadence(function (async, address) {
                async([function () {
                    countdown.unlock()
                }], function () {
                    this._destructible.durable([ 'child', address ], this, '_spawn', address, async())
                }, function (child) {
                    created[address.name][address.index] = child
                })
            }).call(this, address, this._destructible.ephemeral([ 'spawn', address ]))
        }
    }
    async(function () {
        countdown.unlock()
        countdown.exclude(async())
    }, function () {
        return [ created ]
    })
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
        listener.spawn(configuration, async())
    })
})
