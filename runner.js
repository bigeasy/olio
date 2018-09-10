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
var Interrupt = require('interrupt').createInterrupter('subordinate')

var descendent = require('foremost')('descendent')

var Monitor = require('./monitor')

function Runner (destructible, options) {
    this.destroyed = false
    destructible.markDestroyed(this)
    var argv = options.argv.slice()
    this._name = options.name
    this._children = {
        argv: argv,
        count: coalesce(options.workers, 1),
        array: []
    }
    this.pids = []
    this._process = options.process
    for (var i = 0; i < this._children.count; i++) {
        this._run(destructible, i, destructible.monitor([ 'child', i ]))
    }
}

// Somewhere note that ordinary children are not run using cluster, so the
// disconnect confustion only applies to our sandboxed `server.bin.js` program
// that does run a cluster.
Runner.prototype._run = cadence(function (async, destructible, index) {
    var env = JSON.parse(JSON.stringify(process.env))
    env.OLIO_WORKER_INDEX = index
    var child = children.spawn(this._children.argv[0], this._children.argv.slice(1), { env: env, stdio: [ 0, 1, 2, 'ipc' ] })

    this.pids.push(child.pid)

    destructible.destruct.wait(child, 'kill')

    this._children.array[index] = child

    descendent.addChild(child, { name: this._name, argv: this._children.argv, index: index })

    Monitor(Interrupt, this, child, async())
})

module.exports = function (destructible, options, callback) {
    callback(null, new Runner(destructible, options))
}
