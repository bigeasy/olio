require('proof')(4, require('cadence')(prove))

function prove (async, okay) {
    var descendent = require('foremost')('descendent')
    var Signal = require('signal')
    var ready = new Signal()
    var expected = [function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:registered',
            to: [ 0 ],
            path: [ 2 ],
            body: {}
        }, 'register')
    }, function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:ready',
            to: [ 0 ],
            path: [ 2 ],
            body: {}
        }, 'ready')
    }, function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:message',
            to: [ 2 ],
            path: [ 2 ],
            body: {
                to: { name: 'run', index: 0 },
                from: { name: 'run', index: 0 },
                body: { sequence: 0 }
            }
        }, 'kibitz')
        descendent.across('olio:message', {
            to: { name: 'run', index: 0 },
            from: { name: 'run', index: 0 },
            body: { sequence: 0 }
        })
    }]
    descendent.on('olio:mock', function () { ready.unlatch() })
    var destructible
    async(function () {
        var descendent = require('foremost')('descendent')
        descendent.createMockProcess()
        async(function () {
            descendent.increment()
        }, [function () {
            descendent.decrement()
        }], function () {
            descendent.on('olio:mock', function () { ready.unlatch() })
            descendent.process.on('descendent:sent', function () {
                expected.shift().apply(null, arguments)
            })
            destructible = require('../child').destructible
            ready.wait(async())
            descendent.across('olio:operate', {
                method: 'initialize',
                name: 'run',
                properties: { path: 't/child.bin', properties: {} },
                index: 0
            })
            descendent.across('olio:operate', {
                method: 'created',
                name: 'run',
                addresses: [[ 2 ]],
                count: 1
            })
        })
    }, function () {
        destructible.completed.wait(async())
        process.emit('SIGTERM')
    }, function () {
        okay(true, 'ran')
    })
}
