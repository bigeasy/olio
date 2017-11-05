require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var path = require('path')
    var Listener = require('../listener')
    var cadence = require('cadence')
    var Descendent = require('descendent')
    var descendent = new Descendent(process)
    var socketPath = path.join(__dirname, 'socket')
    var listener = new Listener(descendent, socketPath)
    okay(listener, 'constructor')

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'destructible')

    destructible.completed.wait(async())
    destructible.addDestructor('listener', listener, 'destroy')

    listener.listen(destructible.monitor('listen'))

    cadence(function () {
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
            var Operation = require('operation/variadic')
            var http = require('http')

            var descendent = new Descendent(process)
            destructible.addDestructor('descendent', descendent, 'destroy')

            destructible.addDestructor('listener', listener, 'destroy')
            listener.listen(destructible.monitor([ 'listener' ]))

            var downgrader = new Downgrader
            downgrader.on('socket', Operation([ listener, 'socket' ]))

            var server = http.createServer(listener.reactor.middleware)
            server.on('upgrade', Operation([ downgrader, 'upgrade' ]))

            destructible.addDestructor('listen', server, 'close')

            server.listen(socketPath, async())
        }, function () {
            listener.children([
                {"method":"run","parameters":{"workers":"1"},"argv":["./t/run.bin.js" ]},
                {"method":"serve","parameters":{"workers":"1"},"argv":["./t/serve.bin.js" ]}
            ])
            async(function () {
                setTimeout(async(), 1000)
            }, function () {
                console.log('done')
            })
        })
    })(destructible.monitor('test'))
}
