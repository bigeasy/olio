var serialize = require('procession/serialize')
var deserialize = require('procession/deserialize')
var cadence = require('cadence')
var Procession = require('procession')
var catcher = require('./catcher')

module.exports = cadence(function (async, destructible, name, index, input, output, sip) {
    var inbox = new Procession, outbox = new Procession, shifter = inbox.shifter()
    catcher({
        label: 'deserialize',
        queue: inbox,
        entry: { olio: { name: name, index: index } },
        f: function (callback) { deserialize(input, inbox, sip, callback) }
    }, destructible.monitor('deserialize'))
    catcher({
        label: 'serialize',
        queue: null,
        entry: { olio: { name: name, index: index } },
        f: function (callback) { serialize(outbox.shifter(), output, callback) }
    }, destructible.monitor('serialize'))
    destructible.destruct.wait(outbox, 'end')
    destructible.destruct.wait(inbox, 'end')
    return [ shifter, outbox ]
})
