require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Procedure = require('conduit/procedure')
    var Caller = require('conduit/caller')
    var cadence = require('cadence')
    var events = require('events')
    var ee = new events.EventEmitter
    var Mock = require('../mock.redux')
    var Olio = require('../olio')
    var mock = new Mock(ee)
    var olio = new Olio(ee, function (configuration) {
        configuration.receiver = function (destructible, argv, callback) {
            destructible.monitor('procedure', Procedure, function (envelope, callback) { callback(null, 0) }, callback)
        }
        configuration.sender([ 'program', 'command' ], function (destructible, argv, index, count, callback) {
            destructible.monitor('caller', Caller, callback)
        })
    })
    mock.initialize([ 'program', 'self' ], 0)
    mock.sibling([ 'program', 'command' ], 1, function (destructible, index, count, callback) {
        destructible.monitor('procedure', Procedure, cadence(function (async, envelope) { return [ 1 ] }), callback)
    })
    mock.sibling([ 'program', 'ignored' ], 1, function () {
        throw new Error('error')
    })

    var Destructible = require('destructible')
    var destructible = new Destructible(1000, 'mock')

    destructible.destruct.wait(olio, 'destroy')

    destructible.completed.wait(async())

    olio.listen(destructible.monitor('olio'))

    cadence(function (async) {
        async(function () {
            destructible.monitor('caller', Caller, async())
        }, function (caller) {
            destructible.destruct.wait(function () { caller.inbox.push(null) })
            mock.sender([ 'program', 'client' ], 0, caller)
            async(function () {
                olio.ready.wait(async())
            }, function () {
                caller.invoke({}, async())
            }, function (result) {
                okay(result, 0, 'receiver')
                olio.sender([ 'program', 'command' ], 0).invoke({}, async())
            }, function (result) {
                okay(result, 1, 'sender')
            })
        })
    })(destructible.monitor('test'))
}
