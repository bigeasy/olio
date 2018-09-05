require('proof')(7, require('cadence')(prove))

function prove (async, okay) {
    var Downgrader = require('downgrader')

    var http = require('http')
    var delta = require('delta')
    var cadence = require('cadence')

    var Operation = require('operation')

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'olio.t')

    var Olio = require('..')

    var Caller = require('conduit/caller')
    var Procedure = require('conduit/procedure')

    var bin = require('../olio.bin')
    var fs = require('fs')

    var descendent = require('foremost')('descendent')

    try {
        fs.unlinkSync('t/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var SocketFactory = require('../socketeer')
    var factory = new SocketFactory
    var Receiver = function (destructible, from, to, callback) {
        destructible.monitor('procedure', Procedure, function () {}, callback)
    }

    var olio, server
    async(function () {
        var downgrader = new Downgrader
        downgrader.on('socket', function (request, socket) {
            var message = {
                to: {
                    index: +request.headers['x-olio-to-index'],
                    name: request.headers['x-olio-to-name']
                },
                from: {
                    index: +request.headers['x-olio-from-index'],
                    name: request.headers['x-olio-from-name']
                }
            }
            okay(message, {
                to: { index: 0, name: 'that' },
                from: { index: 2, name: 'this' }
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
        program.env = { DESCENDENT_PROCESS_PATH: '0' }

        descendent.process = program
        descendent.increment()

        async(function () {
            destructible.monitor('olio', Olio, program, function (configure) {
                configure.receiver = function (destructible, from, to, callback) {
                    destructible.monitor('procedure', Procedure, function () {}, callback)
                }
                configure.sender('that', function (destructible, argv, index, count, callback) {
                    destructible.monitor('caller', Caller, callback)
                })
            }, async())

            program.emit('message', {
                module: 'descendent',
                method: 'route',
                name: 'olio:message',
                to: [],
                path: [],
                body: {
                    method: 'initialize',
                    name: 'this',
                    argv: [ 'program', 'this' ],
                    index: 2
                }
            })
            program.emit('message', {
                module: 'descendent',
                method: 'route',
                name: 'olio:message',
                to: [],
                path: [],
                body: {
                    method: 'created',
                    name: 'that',
                    paths: [[ 0, 1 ]],
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
                    okay(!!olio.sender('that', 0), 'receiver')
                    okay(!!olio.sender('that', 'x'), 'receiver hash')
                    okay(olio.path('that', 0), [ 0, 1 ], 'path')
                    okay(olio.count('that'), 1, 'receiver count')
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
