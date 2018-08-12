// The listener implements a Node.js Cluster "Master." I call it a listener
// because I think of it as listening to the bound port.
//
// Our listener implementation starts the cluster workers. It uses the
// `Cluster.setupMaster` method to specify a specific worker executable instead
// of using the behavior that looks like fork yet behaves nothing like fork and
// is therefore very confusing.
//
// In case you ever forget; you must use cluster to support Windows. Your
// support here should be enough to evolve a Windows implementation that is as
// performant as Node.js can be on Windows. Windows is slow about passing
// handles, so you shouldn't roll your own handle passing strategy. It would
// only work for TCP/TLS anyway. You can't pass the TCP handles of an HTTP
// server around and no you're are not going to implement HTTP parsing.

// From the Node.js API.
var path = require('path')
var assert = require('assert')
var url = require('url')
var cluster = require('cluster')
var children = require('child_process')

// Return the first not null-like value.
var coalesce = require('extant')

// Control-flow utilities.
var delta = require('delta')
var cadence = require('cadence')
var Signal = require('signal')

// Controlled demolition of objects.
var Destructible = require('destructible')

// Exceptions that you can catch by type.
var Interrupt = require('interrupt').createInterrupter('subordinate')

var Monitor = require('./monitor')
var Search = require('./search')

function Server (destructible, process, name, argv, descendent) {
    var command = Search(argv[0], process.env.PATH)
    cluster.setupMaster({ exec: command, args: argv.slice(1) })
    this._name = name
    this._argv = argv
    this._process = process
    this._destructible = destructible
    this._destructible.markDestroyed(this)
    this._destructible.destruct.wait(this, '_shutdown')
    this._descendent = descendent
    this._pids = []
}

// https://groups.google.com/forum/#!msg/comp.unix.wizards/GNU3ZFJiq74/ZFeCKhnavkMJ
Server.prototype._shutdown = function () {
    // TODO Can't I just call `child.kill`?
    for (var id in cluster.workers) {
        cluster.workers[id].kill()
    }
}

Server.prototype.run = function (count, environment) {
    for (var i = 0, I = coalesce(count, 1); i < I; i++) {
        var child = cluster.fork(environment(i))
        this._descendent.addChild(child.process, { name: this._name, argv: this._argv, index: i })
        this._pids.push(child.process.pid)
        Monitor(Interrupt, this, child, this._destructible.monitor([ 'child', i ]))
    }
}

module.exports = function (destructible, process, name, argv, descendent, callback) {
    callback(null, new Server(destructible, process, name, argv, descendent))
}
