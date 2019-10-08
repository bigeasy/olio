#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help
            display this message

        --scram  <number>
            number of milliseconds to wait before declaring constituent
            shutdown hung and forcing shutdown

        --application <string>
            path to composition definition

        --configuration <string>
            path to configuration JSON

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, { messenger: process }, async arguable => {
    await new Promise(resolve => setImmediate(resolve))

    const logger = require('prolific.logger').create('olio')

    const Destructible = require('destructible')
    const destructible = new Destructible('olio')

    const coalesce = require('extant')

    const sendIf = require('./send')

    require('foremost')('prolific.shuttle').create()

    arguable.required('application', 'configuration')

    const Listener = require('./listener')

    const path = require('path')

    function resolve (file) {
        if (file[0] == '.') {
            return path.resolve(process.cwd(), file)
        }
        return file
    }

    const file = {
        application: resolve(arguable.ultimate.application),
        configuration: resolve(arguable.ultimate.configuration)
    }

    const configuration = require(file.configuration)
    const application = require(file.application).configure(configuration)

    const listener = new Listener(destructible.durable('listener'), configuration)

    const Queue = require('avenue')

    const sockets = new Queue().shifter().paired
    const Header = require('./header')

    destructible.durable('socket', async () => {
        for await (const socket of sockets.shifter.iterator()) {
            const header = await Header(socket)
            listener.socket(header, socket)
        }
    })
    destructible.destruct(() => sockets.shifter.destroy())

    const once = require('prospective/once')
    const net = require('net')
    const server = net.createServer(function (socket) {
        sockets.queue.push(socket)
    })
    server.listen(application.socket)
    await once(server, 'listening').promise
    // Passing sockets around makes it hard for us to ensure that we are going
    // to destroy them. They could be in a pipe on the way down to a child that
    // exits before getting the message. I've not seen evidence that delivery is
    // guaranteed. When I leave a listener outside of my Descendent module to
    // see if I can catch the straggling message, I don't see it and we exit
    // with an exception thrown from within Node.js, assertion failures from
    // within the C++. We `unref` here to surrender any socket handles in the
    // process of being passed to constituents.
    //
    // We should always have a child of some kind so we don't have to worry
    // about this unref'ed server causing us to exit early.

    //
    server.unref()

    destructible.destruct(() => server.close())

    listener.spawn(application)

    await listener.ready

    sendIf(arguable.options.messenger, 'olio:ready')

    await arguable.destroyed
    destructible.destroy()
    await destructible.destructed

    return 0
})
