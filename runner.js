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

var Monitor = require('./monitor')

function Runner (options) {
    var argv = options.argv.slice()
    this._children = {
        argv: argv,
        count: coalesce(options.workers, 1),
        array: []
    }
    this.pids = []
    this._destructible = new Destructible(1000, 'olio/runner')
    this._destructible.markDestroyed(this)
    this._process = options.process
    this._descendent = options.descendent
}

Runner.prototype.destroy = function () {
    this._destructible.destroy()
}

Runner.prototype._run = cadence(function (async, index) {
    var child = children.spawn(this._children.argv[0], this._children.argv.slice(1), { stdio: [ 0, 1, 2, 'ipc' ] })

    this.pids.push(child.pid)

    this._destructible.addDestructor([ 'child', index ], child, 'kill')

    this._children.array[index] = child

    this._descendent.addChild(child, { child: child, index: index })
    this._descendent.down([ child.pid ], 'olio:message', {
        method: 'initialize',
        argv: this._children.argv,
        index: index
    })

    Monitor(interrupt, this, child, async())
})

Runner.prototype.run = cadence(function (async) {
    for (var i = 0; i < this._children.count; i++) {
        this._run(i, this._destructible.monitor([ 'child', i ]))
    }
    this._destructible.completed.wait(async())
})

module.exports = Runner
