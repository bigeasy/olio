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

var Monitor = require('./monitor')

function Runner (options) {
    var argv = options.argv.slice()
    this._name = options.name
    this._children = {
        argv: argv,
        count: coalesce(options.workers, 1),
        array: []
    }
    this.pids = []
    // TODO Isn't this the default timeout?
    this._destructible = new Destructible(1000, 'olio/runner')
    this._destructible.markDestroyed(this)
    this._process = options.process
    this._descendent = options.descendent
}

Runner.prototype.destroy = function () {
    this._destructible.destroy()
}

// Somewhere note that ordinary children are not run using cluster, so the
// disconnect confustion only applies to our sandboxed `server.bin.js` program
// that does run a cluster.
Runner.prototype._run = cadence(function (async, index) {
    var child = children.spawn(this._children.argv[0], this._children.argv.slice(1), { stdio: [ 0, 1, 2, 'ipc' ] })

    this.pids.push(child.pid)

    this._destructible.destruct.wait(child, 'kill')

    this._children.array[index] = child

    this._descendent.addChild(child, { name: this._name, argv: this._children.argv, index: index })

    Monitor(interrupt, this, child, async())
})

Runner.prototype.run = cadence(function (async) {
    for (var i = 0; i < this._children.count; i++) {
        this._run(i, this._destructible.monitor([ 'child', i ]))
    }
    this._destructible.completed.wait(async())
})

module.exports = Runner
