require('proof')(4, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('test/constituent.t.js')
    destructible.completed.wait(callback)
    var descendent = require('foremost')('descendent')
    var Signal = require('signal')
    var events = require('events')
    var messaged = new Signal()
    var expected = [function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:registered',
            to: [ 0 ],
            path: [ 2 ],
            body: {}
        }, 'register')
        descendent.across('olio:operate', {
            method: 'registered',
            name: 'run',
            index: 0,
            address: [ 2 ],
            count: 1
        })
    }, function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:ready',
            to: [ 0 ],
            path: [ 2 ],
            body: {}
        }, 'ready')
        descendent.across('olio:message', {
            name: 'child:request',
            body: { sequence: 0 }
        })
    }, function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:message',
            to: [ 2 ],
            path: [ 2 ],
            body: {
                name: 'child:response',
                body: { sequence: 0 }
            }
        }, 'kibitz')
        messaged.unlatch()
    }]
    var cadence = require('cadence')
    var constituent = require('../child')
    descendent.createMockProcess()
    var process = new events.EventEmitter
    cadence(function (async) {
        var mocked = new Signal()
        async(function () {
            descendent.increment()
        }, [function () {
            descendent.decrement()
        }], function () {
            descendent.on('olio:mock', function () { mocked.unlatch() })
            descendent.process.on('descendent:sent', function () {
                expected.shift().apply(null, arguments)
            })
            mocked.wait(async())
        }, function () {
            descendent.across('olio:operate', {
                method: 'initialize',
                program: { name: 'program', index: 0 },
                name: 'run',
                source: { path: 'test/child.bin' },
                properties: {},
                index: 0,
                count: 1,
                counts: { run: 1 }
            })
            descendent.across('olio:operate', {
                method: 'created',
                name: 'run',
                addresses: [[ 2 ]],
                count: 1
            })
            messaged.wait(async())
        }, function () {
            process.emit('disconnect')
        })
    })(destructible.durable('supervior'))
    cadence(function (async) {
        async(function () {
            constituent({ scram: 10000 }, { disconnected: process }, async())
        }, function (child) {
            async(function () {
                child.exit(async())
            }, function (exitCode) {
                okay(exitCode, 0, 'exit')
            })
        })
    })(destructible.durable('consituent'))
}
