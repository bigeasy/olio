require('proof')(6, require('cadence')(prove))

function prove (async, okay) {
    var Downgrader = require('downgrader')

    var http = require('http')
    var delta = require('delta')

    var Operation = require('operation/variadic')

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'olio.t')

    var Olio = require('..')

    var Requester = require('conduit/requester')
    var Responder = require('conduit/responder')

    var bin = require('../olio.bin')
    var fs = require('fs')

    try {
        fs.unlinkSync('t/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var olio, server
    async(function () {
        var downgrader = new Downgrader
        downgrader.on('socket', function (request, socket) {
            var message = {
                to: {
                    index: +request.headers['x-olio-to-index'],
                    argv: JSON.parse(request.headers['x-olio-to-argv']),
                },
                from: {
                    index: +request.headers['x-olio-from-index'],
                    argv: JSON.parse(request.headers['x-olio-from-argv'])
                }
            }
            okay(message, {
                to: { index: 0, argv: [ 'program', 'that' ] },
                from: { index: 2, argv: [ 'program', 'this' ] }
            }, 'headers')
            destructible.addDestructor('socket', socket, 'destroy')
            olio._createReceiver(message, socket, destructible.rescue('create'))
        })

        server = http.createServer(function () {})
        server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

        destructible.addDestructor('listen', server, 'close')

        server.listen('t/socket', async())
    }, function () {
        var events = require('events')
        var program = new events.EventEmitter

        olio = new Olio(program, function (configure) {
            configure.receiver = function () {
                return new Responder(null)
            }
            configure.sender([ 'program', 'that' ], function () {
                return new Requester()
            })
        })

        program.emit('message', {})
        program.emit('message', {
            module: 'olio',
            method: 'initialize',
            argv: [ 'program', 'this' ],
            index: 2
        })
        program.emit('message', {
            module: 'olio',
            method: 'created',
            argv: [ 'program', 'that' ],
            socketPath: 't/socket',
            count: 1
        })

        olio.listen(destructible.monitor('olio'))
        destructible.addDestructor('olio', olio, 'destroy')

        async(function () {
            olio.ready.wait(async())
        }, function () {
            okay(true, 'ready')
            okay(!!olio.sender([ 'program', 'that' ], 0), 'receiver')
            okay(!!olio.sender([ 'program', 'that' ], 'x'), 'receiver hash')
            okay(olio.count([ 'program', 'that' ]), 1, 'receiver count')
            destructible.destroy()
        })


        okay(Olio, 'require')
        destructible.completed.wait(async())
    })
}
