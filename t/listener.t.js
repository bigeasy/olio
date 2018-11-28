require('proof')(4, prove)

function prove (okay, callback) {
    var path = require('path')

    var Listener = require('../listener')

    var socketPath = path.join(__dirname, 'socket')

    var UserAgent = require('vizsla')
    var ua = new UserAgent

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
            destructible.durable('listener', Listener, configuration, async())
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
                var http = require('http')

                var downgrader = new Downgrader
                downgrader.on('socket', listener.socket.bind(listener))

                var server = http.createServer(listener.reactor.middleware)
                server.on('upgrade', downgrader.upgrade.bind(downgrader))

                destructible.destruct.wait(server, 'close')

                server.listen(socketPath, async())
            }, function () {
                listener.spawn(configuration, async())
            }, function () {
                ua.fetch({
                    url: '/',
                    socketPath: './t/socket',
                    parse: 'text',
                    raise: true
                }, async())
            }, function (body, response) {
                okay(body, 'Olio Listener API\n', 'index')
                setTimeout(async(), 1000)
            }, function () {
                ua.fetch({
                    url: 'http://127.0.0.1:8888/worker/0/conduit',
                    parse: 'json',
                    post: {}
                }, async())
            }, function (body, response) {
                okay(body, 1, 'conduit')
                ua.fetch({
                    url: 'http://127.0.0.1:8888/worker/0/ipc',
                    parse: 'json',
                    post: {}
                }, async())
            }, function (body, response) {
                okay(body, 0, 'ipc')
            })
        })
    })(destructible.durable('test'))
}
