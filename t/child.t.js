require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var descendent = require('foremost')('descendent')
    var Signal = require('signal')
    var ready = new Signal()
    descendent.on('olio:mock', function () { ready.unlatch() })
    var destructible
    async(function () {
        var descendent = require('foremost')('descendent')
        async(function () {
            descendent.increment()
        }, [function () {
            descendent.decrement()
        }], function () {
            descendent.on('olio:mock', function () { ready.unlatch() })
            destructible = require('../child').destructible
            ready.wait(async())
            descendent.across('olio:operate', {
                method: 'initialize',
                properties: { path: 't/child.bin', properties: {} },
                index: 0
            })
        })
    }, function () {
        destructible.completed.wait(async())
        process.emit('SIGTERM')
    }, function () {
        okay(true, 'ran')
    })
}
