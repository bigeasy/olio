#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help
            display this message

        --kill  <number>
            number of milliseconds to wait before declaring child processess hung

        --socket <string>
            path for UNIX domain socket server

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, function (program, callback) {
    // Convert an HTTP request into a raw socket.
    var Downgrader = require('downgrader')

    // Contextualized callbacks and event handlers.
    var Operation = require('operation')

    var http = require('http')
    var delta = require('delta')

    var Descendent = require('descendent')
    var logger = require('prolific.logger').createLogger('olio')

    var coalesce = require('extant')

    var kill = +coalesce(program.ultimate.kill, 5000)
    program.assert(kill, 'kill must be an integer')

    var Destructible = require('destructible')
    var destructible = new Destructible(kill, 'olio/listen.bin')
    program.on('shutdown', destructible.destroy.bind(destructible))

    var Shuttle = require('prolific.shuttle')
    var shuttle = Shuttle.shuttle(program, logger)
    destructible.destruct.wait(shuttle, 'close')

    destructible.completed.wait(callback)

    var children = program.argv.map(JSON.parse.bind(JSON))

    program.required('socket')

    var descendent = new Descendent(process)
    destructible.destruct.wait(descendent, 'destroy')

    var cadence = require('cadence')

    var Listener = require('./listener')

    cadence(function (async) {
        async(function  () {
            destructible.monitor('listener', Listener, descendent, program.ultimate.socket, async())
        }, function (listener) {
            var downgrader = new Downgrader
            downgrader.on('socket', Operation([ listener, 'socket' ]))

            var server = http.createServer(listener.reactor.middleware)
            server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

            destructible.destruct.wait(server, 'close')

            // Passing sockets around makes it hard for us to ensure that we are
            // going to destroy them. They could be in a pipe on the way down to a
            // child that exits before getting the message. I've not seen evidence
            // that delivery is guaranteed. When I leave a listener outside of my
            // Descendent module to see if I can catch the straggling message, I
            // don't see it and we exit with an exception thrown from within
            // Node.js, assertion failures from within the C++. We `unref` here to
            // surrender any socket handles in the process of being passed to
            // children.
            //
            // We should always have a child of some kind so we don't have to worry
            // about this unref'ed server causing us to exit early.
            server.unref()

            async(function () {
                server.listen(program.ultimate.socket, async())
            }, function () {
                listener.children(children, async())
            }, function () {
                program.ready.unlatch()
            })
        })
    })(destructible.monitor('initialize', true))
})
