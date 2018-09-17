var http = require('http')
var cadence = require('cadence')
var Signal = require('signal')
var util = require('util')
var events = require('events')
var descendent = require('foremost')('descendent')

var coalesce = require('extant')

function Mock () {
    this._pid = 0
    var ready = this.ready = new Signal
    descendent.on('olio:mock', function () { ready.unlatch() })
}

Mock.prototype.initialize = function (argv, index) {
    descendent.across('olio:message', {
        method: 'factory'
    }, this)
    descendent.across('olio:message', {
        method: 'initialize',
        argv: argv,
        index: index
    })
}

Mock.prototype.sender = function (name, index, sender) {
    descendent.across('olio:message', {
        method: 'connect',
        from: { name: name, index: index }
    }, coalesce(sender))
    return sender
}

Mock.prototype.sibling = function (name, count, factory) {
    var paths = []
    for (var i = 0; i < count; i++) {
        paths[i] = [ 0, ++this._pid ]
    }
    descendent.across('olio:message', {
        method: 'created',
        paths: paths,
        name: name,
        argv: [],
        socketPath: null,
        count: count
    }, factory)
}

Mock.prototype.createReceiver = cadence(function (async, destructible, Receiver, message, sender) {
    async(function () {
        destructible.monitor('receiver', Receiver, message.from, message.to, async())
    }, function (receiver) {
        destructible.destruct.wait(function () { receiver.inbox.push(null) })
        sender.outbox.pump(receiver.inbox)
        receiver.outbox.pump(sender.inbox)
    })
})

Mock.prototype.createSender = cadence(function (async, destructible, from, Receiver, message, Sibling, index) {
    async(function () {
        destructible.monitor('sibling', Sibling, index, message.count, async())
    }, function (sibling) {
        destructible.destruct.wait(function () { sibling.inbox.push(null) })
        async(function () {
            destructible.monitor('receiver', Receiver, message.argv, index, message.count, async())
        }, function (receiver) {
            receiver.outbox.pump(sibling.inbox)
            destructible.destruct.wait(function () { receiver.inbox.push(null) })
            sibling.outbox.pump(receiver.inbox)
        })
    })
})

module.exports = Mock
