const coalesce = require('extant')
const Resolve = require('./resolve')
const Dispatcher = require('./dispatcher')

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --scram  <number>
            number of milliseconds to wait before declaring constituent
            processess hung

    ___ $ ___ en_US ___
 */
require('arguable')(module, {
    $trap: 'swallow',
    disconnected: process
}, async (arguable) => {
    const Destructible = require('destructible')
    // TODO How do we name these really?
    const destructible = new Destructible('constituent', 500)
    const logger = require('prolific.logger').create('olio')

    require('foremost')('prolific.shuttle').create()

    const descendant = require('foremost')('descendant')

    descendant.increment()
    destructible.destruct(() => descendant.decrement())

    const dispatcher = new Dispatcher(destructible.durable('dispatcher'), {
        kibitz: (address, message, handle) => {
            descendant.up(address, 'olio:message', message, handle)
        }
    })

    function fromParent (message, handle) {
        dispatcher.fromParent(message.body, handle)
    }
    descendant.on('olio:operate', fromParent)
    function fromSibling (message, handle) {
        dispatcher.fromSibling(message.body, handle)
    }
    descendant.on('olio:message', fromSibling)
    destructible.destructed.then(() => {
        descendant.removeListener('olio:operate', fromParent)
        descendant.removeListener('olio:message', fromSibling)
    })
    descendant.on('olio:shutdown', () => destructible.destroy())
    destructible.destructed.then(() => arguable.options.disconnected.disconnect())

    descendant.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})

    const [ olio, source, properties ] = await dispatcher.olio.promise

    const Constituent = Resolve(source, require)
    require('prolific.sink').properties.olio = { name: olio.name, index: olio.index }
    function memoryUsage () { logger.notice('memory', process.memoryUsage()) }
    memoryUsage()
    setInterval(memoryUsage, 5000).unref()

    const sub = destructible.durable([ 'constituent', olio.name, olio.index ])
    dispatcher.receiver = await Constituent(destructible, olio, properties)

    descendant.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})

    await destructible.destructed
    return 0
})
