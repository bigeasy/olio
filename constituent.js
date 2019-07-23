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
    console.log('LAUNCHED CONSTITUENT')
    const Destructible = require('destructible')
    // TODO How do we name these really?
    const destructible = new Destructible('constituent', 500)
    const logger = require('prolific.logger').createLogger('olio')

    const shuttle = require('foremost')('prolific.shuttle')
    shuttle.start({ uncaughtException: logger, exit: true })
    destructible.destruct(() => shuttle.close())

    const descendent = require('foremost')('descendent')

    descendent.increment()
    destructible.destruct(() => descendent.decrement())

    const dispatcher = new Dispatcher(destructible.durable('dispatcher'), {
        kibitz: (address, message, handle) => {
            descendent.up(address, 'olio:message', message, handle)
        }
    })

    function fromParent (message, handle) {
        dispatcher.fromParent(message.body, handle)
    }
    descendent.on('olio:operate', fromParent)
    function fromSibling (message, handle) {
        dispatcher.fromSibling(message.body, handle)
    }
    descendent.on('olio:message', fromSibling)
    destructible.promise.then(() => {
        descendent.removeListener('olio:operate', fromParent)
        descendent.removeListener('olio:message', fromSibling)
    })
    descendent.on('olio:shutdown', () => destructible.destroy())
    destructible.promise.then(() => arguable.options.disconnected.disconnect())

    descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:registered', {})

    const [ olio, source, properties ] = await dispatcher.olio.promise

    const Constituent = Resolve(source, require)
    require('prolific.sink').properties.olio = { name: olio.name, index: olio.index }
    function memoryUsage () { logger.notice('memory', process.memoryUsage()) }
    memoryUsage()
    setInterval(memoryUsage, 5000).unref()

    const sub = destructible.durable([ 'constituent', olio.name, olio.index ])
    dispatcher.receiver = await Constituent(destructible, olio, properties)

    descendent.up(+coalesce(process.env.OLIO_SUPERVISOR_PROCESS_ID, 0), 'olio:ready', {})

    await destructible.promise
    return 0
})
