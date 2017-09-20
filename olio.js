var Operation = require('operation/variadic')
var stream = require('stream')
var Staccato = require('staccato')
var http = require('http')
var interrupt = require('interrupt').createInterrupter('olio')
var delta = require('delta')
var assert = require('assert')
var Signal = require('signal')
var Downgrader = require('downgrader')
var Conduit = require('conduit')
var fnv = require('hash.fnv')

function Constructor (olio) {
    this._olio = olio
}

Constructor.prototype.sender = function (argv, builder) {
    var ready = new Signal
    this._olio._latches.push(ready)
    this._olio._senders.array.push({ argv: argv, builder: builder, receivers: [], ready: ready  })
}

var cadence = require('cadence')
var Destructible = require('destructible')
var Keyify = require('keyify')

function Olio (program, configurator) {
    this._senders = { array: [], map: {} }
    this._latches = []

    this.ready = new Signal

    this._latches.push(this._initialized = new Signal)

    var constructor = new Constructor(this)
    configurator(constructor)

    this._receiver = constructor.receiver
    this._shutdown = constructor.shutdown

    this._destructible = new Destructible(750, 'olio')
    this._destructible.markDestroyed(this)
    this.destroyed = false

    this._ready(this._destructible.rescue('ready'))

    var message
    program.on('message',  message = Operation([ this, '_message' ]))
    this._destructible.addDestructor('message', function () {
        program.removeListener('message', message)
    })
}

Olio.prototype._createReceiver = cadence(function (async, message, socket) {
    var receiver = this._receiver.call(null, message.argv)

    var destructible = new Destructible([ 'receiver', message.from  ])
    this._destructible.addDestructor([ 'receiver', message.from ], destructible, 'destroy')

    async(function () {
        var conduit = new Conduit(socket, socket, receiver)
        conduit.ready.wait(async())
        destructible.addDestructor('conduit', conduit, 'destroy')
        destructible.addDestructor('socket', socket, 'destroy')
        conduit.listen(null, this._destructible.monitor([ 'receiver', message.from ]))
    }, function () {
        socket.write(new Buffer([ 0xaa, 0xaa, 0xaa, 0xaa ]), async())
    })
})

Olio.prototype._getLink = function (argv) {
    var key = Keyify.stringify(argv)
    var sender
    if (sender = this._senders.map[key]) {
        return sender
    }
    LINKS: for (var i = 0, sender; (sender = this._senders.array[i]) != null; i++) {
        if (sender.argv.length <= argv.length) {
            for (var j = 0; j < sender.argv.length; j++) {
                if (sender.argv[j] != argv[j]) {
                    continue LINKS
                }
                return this._senders.map[key] = sender
            }
        }
    }
    return null
}

Olio.prototype._createSender = cadence(function (async, sender, message, index) {
    var ready = new Signal
    this._latches.push(ready)
    var receiver = sender.builder.call(null, message.argv, index, message.count)
    var through = new stream.PassThrough
    var readable = new Staccato.Readable(through)
    async(function () {
        var request = http.request({
            socketPath: message.socketPath,
            url: 'http://olio',
            headers: Downgrader.headers({
                'x-olio-to-index': index,
                'x-olio-to-argv': JSON.stringify(message.argv),
                'x-olio-from-index': this._index,
                'x-olio-from-argv': JSON.stringify(this._argv)
            })
        })
        delta(async()).ee(request).on('upgrade')
        request.end()
    }, function (request, socket, head) {
        async(function () {
            readable.read(4, async())
            through.write(head)
            socket.pipe(through)
        }, function (buffer) {
            interrupt.assert(buffer != null && buffer.length == 4, 'closed before start')
            interrupt.assert(buffer.toString('hex'), 'aaaaaaaa', 'failed to start middleware')
            socket.unpipe(through)
            readable.destroy()

            var conduit  = new Conduit(socket, socket, receiver)

            this._destructible.addDestructor([ 'conduit', message.argv, message.count ], conduit, 'destroy')
            this._destructible.addDestructor([ 'socket', message.argv, message.count ], socket, 'destroy')

            sender.receivers[index] = { conduit: conduit, receiver: receiver }
            conduit.listen(null, async())
            ready.unlatch()
        })
    }, function () {
        console.log('sender done')
    })
})

Olio.prototype.sender = function (path, index) {
    var sender = this._getLink(path)
    if (typeof index != 'number') {
        var buffer = new Buffer(Keyify.stringify(index))
        index = fnv(0, buffer, 0, buffer.length) % sender.count
    }
    return this._getLink(path).receivers[index].receiver
}

Olio.prototype._message = function (message, socket) {
    if (message.module == 'olio') {
        switch (message.method) {
        case 'initialize':
            this._argv = message.argv
            this._index = message.index
            this._initialized.unlatch()
            break
        case 'connect':
            this._createReceiver(message, socket, this._destructible.rescue([ 'connect', message ]))
            break
        case 'created':
            var sender = this._getLink(message.argv)
            if (sender != null) {
                for (var i = 0; i < message.count; i++) {
                    this._createSender(sender, message, i, this._destructible.monitor([ 'sender', message.argv, i ]))
                }
                sender.ready.unlatch()
            }
            break
        case 'shutdown':
            if (this._shutdown) {
                this._shutdown.call()
            }
            break
        }
    }
}

Olio.prototype._ready = cadence(function (async) {
    async(function () {
        var loop = async(function () {
            if (this._latches.length == 0) {
                return [ loop.break ]
            }
            this._latches.shift().wait(async())
        })()
    }, function () {
        this.ready.unlatch()
    })
})

Olio.prototype.destroy = function () {
    this._destructible.destroy()
}

Olio.prototype.listen = function (callback) {
    this._destructible.completed.wait(callback)
}

module.exports = Olio
