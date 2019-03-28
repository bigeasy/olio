var coalesce = require('extant')
var Resolve = require('./resolve')
var Dispatcher = require('./dispatcher')

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --scram  <number>
            number of milliseconds to wait before declaring child processess hung

    ___ $ ___ en_US ___
 */
require('arguable')(module, {
    $destructible: [ 'olio', 'child' ],
    $scram: 'scram',
    $trap: 'swallow',
    disconnected: process
}, require('cadence')(function (async, destructible, arguable) {
    var logger = require('prolific.logger').createLogger('olio')

    var shuttle = require('foremost')('prolific.shuttle')
    shuttle.start({ uncaughtException: logger, exit: true })
    destructible.destruct.wait(shuttle, 'close')

    var descendent = require('foremost')('descendent')

    descendent.increment()
    destructible.destruct.wait(descendent, 'decrement')

    async(function () {
        destructible.durable('dispatcher', Dispatcher, {
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
        arguable.options.disconnected.once('disconnect', function () {
            destructible.destroy()
        })

        descendent.across('olio:mock', {})
        descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})

        async(function () {
            dispatcher.olio.wait(async())
        }, function (olio, source, properties) {
            var Child = Resolve(source, require)
            async(function () {
                require('prolific.sink').properties.olio = { name: olio.name, index: olio.index }
                function memoryUsage () { logger.notice('memory', process.memoryUsage()) }
                memoryUsage()
                setInterval(memoryUsage, 5000).unref()
                destructible.durable([ 'child', olio.name, olio.index ], Child, olio, properties, async())
            }, function (receiver) {
                dispatcher.receiver = receiver
                descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})
                return []
            })
        })
    })
}))
