require('proof')(6, require('cadence')(prove))

function prove (async, okay) {
    var Downgrader = require('downgrader')

    var http = require('http')
    var delta = require('delta')
    var cadence = require('cadence')

    var Operation = require('operation/variadic')

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'olio.t')

    var Olio = require('..')

    var Caller = require('conduit/caller')
    var Procedure = require('conduit/procedure')

    var bin = require('../olio.bin')
    var fs = require('fs')

    var Descendent = require('descendent')

    try {
        fs.unlinkSync('t/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var SocketFactory = require('../factory/socket')
    var factory = new SocketFactory
    var Receiver = function (destructible, argv, callback) {
        destructible.monitor('procedure', Procedure, function () {}, callback)
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
            destructible.destruct.wait(socket, 'destroy')
            destructible.monitor('create', factory, 'createReceiver', Receiver, message, socket, null)
        })

        server = http.createServer(function () {})
        server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

        destructible.destruct.wait(server, 'close')

        server.listen('t/socket', async())
    }, function () {
        var events = require('events')
        var program = new events.EventEmitter
        program.pid = 0

        var descendent = new Descendent(program)

        async(function () {
            destructible.monitor('olio', Olio, program, function (configure) {
                configure.receiver = function (destructible, argv, callback) {
                    destructible.monitor('procedure', Procedure, function () {}, callback)
                }
                configure.sender([ 'program', 'that' ], function (destructible, argv, index, count, callback) {
                    destructible.monitor('caller', Caller, callback)
                })
            }, async())

            program.emit('message', {
                module: 'descendent',
                name: 'olio:message',
                to: [],
                path: [],
                body: {
                    method: 'initialize',
                    argv: [ 'program', 'this' ],
                    index: 2
                }
            })
            program.emit('message', {
                module: 'descendent',
                name: 'olio:message',
                to: [],
                path: [],
                body: {
                    method: 'created',
                    argv: [ 'program', 'that' ],
                    socketPath: 't/socket',
                    count: 1
                }
            })
        }, function (olio) {
            cadence(function (async) {
                async(function () {
                    olio.ready.wait(async())
                }, function () {
                    okay(true, 'ready')
                    okay(!!olio.sender([ 'program', 'that' ], 0), 'receiver')
                    okay(!!olio.sender([ 'program', 'that' ], 'x'), 'receiver hash')
                    okay(olio.count([ 'program', 'that' ]), 1, 'receiver count')
                    program.emit('message', {
                        module: 'descendent',
                        name: 'olio:message',
                        to: [],
                        path: [],
                        body: {
                            method: 'shutdown'
                        }
                    })
                    destructible.destroy()
                })
            })(destructible.monitor('tests', true))


            okay(Olio, 'require')
            destructible.completed.wait(async())
        })
    })
}
