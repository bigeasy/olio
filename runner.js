// Return the first not null-like value.
var coalesce = require('extant')

// Control-flow utilities.
var delta = require('delta')
var cadence = require('cadence')
var Signal = require('signal')

// Node.js utilities.
var children = require('child_process')

// Controlled demolition of objects.
var Destructible = require('destructible')

// Exceptions that you can catch by type.
var interrupt = require('interrupt').createInterrupter('subordinate')

// Contextualized callbacks and event handlers.
var Operation = require('operation/variadic')

function Runner (options) {
    var argv = options.argv.slice()
    this._children = {
        argv: argv,
        count: coalesce(options.subordinates, 1),
        array: []
    }
    this._destructible = new Destructible('olio/runner')
    this._destructible.markDestroyed(this)
}

Runner.prototype.destroy = function () {
    this._destructible.destroy()
}

Runner.prototype.send = function (message, handle) {
    if (message.to == null) {
        this._children.array.forEach(function (child) {
            child.send(message)
        })
    } else {
        console.log(message)
        this._children.array[message.to.index].send(message, coalesce(handle))
    }
}

// TODO Starting workers as requested for pipelines would be done here now.
Runner.prototype.message = function (message, handle) {
    if (message.module == 'olio') {
        this._children.array[message.index].send(message, coalesce(handle))
    }
}

Runner.prototype._run = cadence(function (async, index) {
    var child = children.spawn(this._children.argv[0], this._children.argv.slice(1), {
        stdio: [ 0, 1, 2, 'ipc' ]
    })
    this._children.array[index] = child
    this._destructible.addDestructor([ 'child', index ], child, 'kill')
    child.send({ module: 'olio', method: 'initialize', argv: this._children.argv, index: index })
    child.on('message', Operation([ this, 'message' ]))
    async(function () {
        delta(async()).ee(child).on('exit')
    }, function (code, signal) {
        console.log('child', index, code, signal)
        interrupt.assert(this.destroyed || signal == 'SIGINT', 'subordinate.exit', { code: code, signal: signal })
    })
})

Runner.prototype.run = cadence(function (async) {
    for (var i = 0; i < this._children.count; i++) {
        this._run(i, this._destructible.monitor([ 'child', i ]))
    }
    this._destructible.completed(1000, async())
})

module.exports = Runner
