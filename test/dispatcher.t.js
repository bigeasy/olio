require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/dispatcher.t')

    destructible.completed.wait(callback)

    var Dispatcher = require('../dispatcher')

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.durable('dispatcher', Dispatcher, null, async())
        }, function (dispatcher) {
            destructible.destroy()
            dispatcher.fromParent({})
            dispatcher.fromParent({}, {
                destroy: function () { okay('destroyed') }
            })
        })
    })(destructible.durable('test'))
}