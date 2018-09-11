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
    async(function () {
        destructible.monitor('olio', Olio, ee, function (destructible, from, to, callback) {
            destructible.monitor('procedure', Procedure, function (envelope, callback) { callback(null, 0) }, callback)
        }, async())
        mock.initialize('self', 0)
        mock.sibling('command', 1, function (destructible, index, count, callback) {
            destructible.monitor('procedure', Procedure, cadence(function (async, envelope) { return [ 1 ] }), callback)
        })
        mock.sibling('ignored', 1, function () {
            throw new Error('error')
        })
    }, function (olio) {
        async(function () {
            olio.sender('command', function (destructible, argv, index, count, callback) {
                destructible.monitor('caller', Caller, callback)
            }, async())
        }, function (sender) {
            async(function () {
                destructible.monitor('caller', Caller, async())
            }, function (caller) {
                destructible.destruct.wait(function () { caller.inbox.push(null) })
                mock.sender('client', 0, caller)
                caller.invoke({}, async())
            }, function (result) {
                okay(result, 0, 'receiver')
                sender.processes[0].sender.invoke({}, async())
            }, function (result) {
                okay(result, 1, 'sender')
                destructible.destroy()
            })
        })
    })
}
