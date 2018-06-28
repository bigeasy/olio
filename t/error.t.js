require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Procedure = require('conduit/procedure')
    var Caller = require('conduit/caller')
    var cadence = require('cadence')
    var events = require('events')
    var ee = new events.EventEmitter
    var Mock = require('../mock')
    var Olio = require('../olio')
    var mock = new Mock(ee)
    var Destructible = require('destructible')
    var destructible = new Destructible('t/mock.t.js')
    destructible.completed.wait(function (error) {
        okay(error.causes[0].message, 'failure', 'destructible destroyed')
    })
    async([function () {
        destructible.monitor('olio', Olio, ee, function (configuration) {
            configuration.sender([ 'program', 'command' ], function (destructible, argv, index, count, callback) {
                callback(new Error('failure'))
            })
        }, async())
        mock.initialize([ 'program', 'self' ], 0)
        mock.sibling([ 'program', 'command' ], 1, function (destructible, index, count, callback) {
            destructible.monitor('procedure', Procedure, cadence(function (async, envelope) { return [ 1 ] }), callback)
        })
    }, function (error) {
        okay(error.message, 'failure', 'initialization failure')
    }])
}
