require('proof')(1, prove)

function prove (okay, callback) {
    var path = require('path')

    var Listener = require('../listener')

    var socketPath = path.join(__dirname, 'socket')

    var Destructible = require('destructible')
    var destructible = new Destructible('destructible')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    var configuration = {
        socket: socketPath,
        children: {
            run: {
                workers: 1,
                properties: {
                    path: './t/run.bin.js',
                }
            },
            serve: {
                workers: 1,
                properties: {
                    path: './t/serve.bin.js',
                }
            }
        }
    }

    cadence(function (async) {
        async(function () {
            destructible.monitor('listener', Listener, configuration, async())
        }, function (listener) {
            async(function () {
                listener.index(async())
            }, function (statusCode, headers, body) {
                okay({
                    statusCode: statusCode,
                    headers: headers,
                    body: body
                }, {
                    statusCode: 200,
                    headers: { 'content-type': 'text/plain' },
                    body: 'Olio Listener API\n'
                }, 'index')
                var Downgrader = require('downgrader')
                var Operation = require('operation')
                var http = require('http')

                var downgrader = new Downgrader
                downgrader.on('socket', Operation([ listener, 'socket' ]))

                var server = http.createServer(listener.reactor.middleware)
                server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

                destructible.destruct.wait(server, 'close')

                server.listen(socketPath, async())
            }, function () {
                listener.spawn(configuration, async())
            }, function () {
                async(function () {
                    setTimeout(async(), 1000)
                }, function () {
                    destructible.destroy()
                })
            })
        })
    })(destructible.monitor('test'))
}
