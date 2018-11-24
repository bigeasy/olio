var noop = require('nop')
var fs = require('fs')
var abend = require('abend')
var path = require('path')
var coalesce = require('extant')

var Destructible = require('destructible')
var destructible = new Destructible([ 'olio' ])

var Resolve = require('./resolve')

var Dispatcher = require('./dispatcher')

destructible.completed.wait(abend)

var logger = require('prolific.logger').createLogger('olio')

var shuttle = require('foremost')('prolific.shuttle')
shuttle.start({ uncaughtException: logger })
destructible.destruct.wait(shuttle, 'close')

process.on('SIGTERM', function () { destructible.destroy() })
process.on('SIGINT', noop)

var cadence = require('cadence')

cadence(function (async) {
    var descendent = require('foremost')('descendent')

    descendent.increment()
    destructible.destruct.wait(descendent, 'decrement')

    async(function () {
        destructible.monitor('dispatcher', Dispatcher, {
            kibitz: function (address, message, handle) {
                descendent.up(address, 'olio:message', message, handle)
            }
        }, async())
    }, function (dispatcher) {
        function fromParent (message, handle) {
            dispatcher.fromParent(message.body, handle)
        }
        descendent.on('olio:operate', fromParent)
        function fromSibling (message, handle) {
            dispatcher.fromSibling(message.body, handle)
        }
        descendent.on('olio:message', fromSibling)
        destructible.completed.wait(function () {
            descendent.removeListener('olio:operate', fromParent)
            descendent.removeListener('olio:message', fromSibling)
        })

        descendent.across('olio:mock', {})
        descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})

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
                descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})
            })
        })
    })
})(destructible.monitor('initialize', true))

exports.destructible = destructible
