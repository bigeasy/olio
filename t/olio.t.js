require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var Downgrader = require('downgrader')

    var http = require('http')
    var delta = require('delta')

    var Operation = require('operation/variadic')

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'olio.t')

    var Olio = require('..')

    var Requester = require('conduit/requester')

    var bin = require('../olio.bin')
    var fs = require('fs')

    try {
        fs.unlinkSync('t/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var program, server
    async(function () {
        var downgrader = new Downgrader
        downgrader.on('socket', function (request, socket) {
            okay({
                toIndex: request.headers['x-olio-to-index'],
                toArguments: JSON.parse(request.headers['x-olio-to-argv']),
                fromIndex: request.headers['x-olio-from-index'],
                fromArguments: JSON.parse(request.headers['x-olio-from-argv'])
            }, {
                toIndex: '0',
                toArguments: [ 'program', 'that' ],
                fromIndex: '2',
                fromArguments: [ 'program', 'this' ]
            }, 'headers')
            destructible.addDestructor('socket', socket, 'destroy')
            socket.write(new Buffer([ 0xaa, 0xaa, 0xaa, 0xaa ]))
        })

        server = http.createServer(function () {})
        server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

        destructible.addDestructor('listen', server, 'close')

        server.listen('t/socket', async())
    }, function () {
        var events = require('events')
        var program = new events.EventEmitter

        var olio = new Olio(program, function (configure) {
            configure.responder = function () {
                return 1
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

        olio.ready.wait(function () {
            destructible.destroy()
            okay(true, 'ready')
        })

        okay(Olio, 'require')
        destructible.completed.wait(async())
    })
}
