require('proof')(1, prove)

function prove (okay, callback) {
    var Procedure = require('conduit/procedure')
    var Caller = require('conduit/caller')
    var cadence = require('cadence')
    var events = require('events')
    var ee = new events.EventEmitter
    var Mock = require('../mock')
    var Olio = require('../olio')
    var mock = new Mock(ee)

    var Destructible = require('destructible')
    var destructible = new Destructible('t/mock.t')

    destructible.completed.wait(callback)

    cadence(function (async) {
        async(function () {
            destructible.monitor('olio', Olio, ee, async())
            mock.initialize('self', 0)
            mock.sibling('command', 1, function (destructible, index, count, callback) {
                destructible.monitor('procedure', Procedure, cadence(function (async, envelope) { return [ 1 ] }), callback)
            })
            mock.sibling('ignored', 1, function (destructible, index, count, callback) {
                callback(new Error('no'))
            })
        }, [function (olio) {
            olio.sender('command', function (destructible, argv, index, count, callback) {
                callback(new Error('failure'))
            }, async())
        }, function (error) {
            okay(error.message, 'failure', 'initialization failure')
            destructible.destroy()
        }])
    })(destructible.monitor('test'))
}
