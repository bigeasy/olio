var noop = require('nop')
var fs = require('fs')
var abend = require('abend')
var path = require('path')

var Destructible = require('destructible')
var destructible = new Destructible([ 'olio' ])

var Resolve = require('./resolve')

var Dispatcher = require('./dispatcher')

var Transmitter = require('./descendent')

destructible.completed.wait(abend)

var logger = require('prolific.logger').createLogger('olio')

var shuttle = require('foremost')('prolific.shuttle')
shuttle.start({ uncaughtException: logger })
destructible.destruct.wait(shuttle, 'close')

process.on('SIGTERM', function () { destructible.destroy() })
process.on('SIGINT', noop)

console.log(Transmitter)
var transmitter = new Transmitter
destructible.destruct.wait(transmitter, 'destroy')

var cadence = require('cadence')

cadence(function (async) {
    async(function () {
        destructible.monitor('dispatcher', Dispatcher, transmitter, async())
    }, function (binder, configuration) {
        require('prolific.sink').properties.olio = { name: binder.name, index: binder.index }
        function memoryUsage () { logger.notice('memory', process.memoryUsage()) }
        memoryUsage()
        setInterval(memoryUsage, 5000).unref()
        var Child = Resolve(configuration, require)
        destructible.monitor([ 'child', binder.name, binder.index ], Child, binder, configuration, async())
    })
})(destructible.monitor('initialize', true))

exports.destructible = destructible
