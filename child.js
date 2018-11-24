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

var cadence = require('cadence')

cadence(function (async) {
    var transmitter = new Transmitter
    destructible.destruct.wait(transmitter, 'destroy')
    async(function () {
        destructible.monitor('dispatcher', Dispatcher, transmitter, async())
    }, function (dispatcher) {
        transmitter.dispatcher = dispatcher
        transmitter.register()
        async(function () {
            dispatcher.ready.wait(async())
        }, function (olio, properties) {
            async(function () {
                require('prolific.sink').properties.olio = { name: olio.name, index: olio.index }
                function memoryUsage () { logger.notice('memory', process.memoryUsage()) }
                memoryUsage()
                setInterval(memoryUsage, 5000).unref()
                var Child = Resolve(properties, require)
                destructible.monitor([ 'child', olio.name, olio.index ], Child, olio, properties, async())
            }, function (receiver) {
                dispatcher.receiver = receiver
                transmitter.ready()
            })
        })
    })
})(destructible.monitor('initialize', true))

exports.destructible = destructible
