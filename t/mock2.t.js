require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var cadence = require('cadence')
    var events = require('events')
    var ee = new events.EventEmitter
    var Mock = require('../mock2')
    var Olio = require('../olio')
    var mock = new Mock
    var olio = new Olio(mock, function (configuration) {
        configuration.receiver = function () {
        }
        configuration.sender([ 'program', 'command' ], function () {
            return new Caller
        })
    })
    var Procedure = require('conduit/procedure')
    var Caller = require('conduit/caller')
    var responder = new Procedure(cadence(function (async, envelope) {}))
    mock.initialize([ 'program', 'self' ], 0)
    mock.create([ 'program', 'command' ], 1, function () {
        return new Procedure(cadence(function (async, envelope) { return [ 1 ] }))
    })

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'mock')

    destructible.addDestructor('olio', olio, 'destroy')

    destructible.completed.wait(async())

    olio.listen(destructible.monitor('olio'))

    cadence(function (async) {
        async(function () {
            olio.ready.wait(async())
        }, function () {
            okay(true, 'ready')
        })
    })(destructible.monitor('test'))
}
