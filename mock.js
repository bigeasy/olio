var http = require('http')
var cadence = require('cadence')
var Signal = require('signal')
var util = require('util')
var events = require('events')
var Descendent = require('descendent')

function Mock (ee) {
    this._descendent = new Descendent(ee)
    var ready = this.ready = new Signal
    this._descendent.on('olio:mock', function () { ready.unlatch() })
}

Mock.prototype.initialize = function (argv, index) {
    this._descendent.across('olio:message', {
        method: 'factory'
    }, this)
    this._descendent.across('olio:message', {
        method: 'initialize',
        argv: argv,
        index: index
    })
}

Mock.prototype.sender = function (name, index, sender) {
    this._descendent.across('olio:message', {
        method: 'connect',
        from: { name: name, index: index }
    }, sender)
    return sender
}

Mock.prototype.sibling = function (name, count, factory) {
    this._descendent.across('olio:message', {
        method: 'created',
        name: name,
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
