require('proof')(1, prove)

function prove (okay) {
    var expected = [function (message) {
        okay(message, {
            module: 'descendent',
            method: 'route',
            name: 'olio:registered',
            to: [ 0 ],
            path: [ 2 ],
            body: {}
        }, 'registered')
    }]
    var descendent = require('foremost')('descendent')
    var events = require('events')
    var process = descendent.createMockProcess()
    descendent.process.on('descendent:sent', function (message, socket) {
        expected.shift()(message, socket)
    })
    var Transmitter = require('../descendent')
    var transmitter = new Transmitter
    transmitter.register()
    transmitter.destroy()
}
