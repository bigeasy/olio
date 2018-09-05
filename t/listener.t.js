require('proof')(1, prove)

function prove (okay, callback) {
    var path = require('path')

    var Listener = require('../listener')

    var socketPath = path.join(__dirname, 'socket')

    var Destructible = require('destructible')
    var destructible = new Destructible('destructible')

    destructible.completed.wait(callback)

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('listener', Listener, socketPath, async())
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
                listener.children([
                    {"method":"run","parameters":{"name":"run","workers":"2"},"argv":["./t/run.bin.js" ]},
                    {"method":"serve","parameters":{"name":"serve","workers":"1"},"argv":["./t/serve.bin.js" ]}
                ], async())
            }, function () {
                async(function () {
                    setTimeout(async(), 1000)
                }, function () {
                    console.log('done')
                    destructible.destroy()
                })
            })
        })
    })(destructible.monitor('test'))
}
