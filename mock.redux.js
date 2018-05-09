var http = require('http')
var Destructible = require('destructible')
var cadence = require('cadence')
var Signal = require('signal')
var util = require('util')
var events = require('events')
var Descendent = require('descendent')

function Mock (ee) {
    this._descendent = new Descendent(ee)
    this._destructible = new Destructible(5000, 'olio/mock')
    this.ready = new Signal
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

Mock.prototype.sender = function (argv, index, sender) {
    this._descendent.across('olio:message', {
        method: 'connect',
        from: { argv: argv, index: index }
    }, sender)
    return sender
}

Mock.prototype.sibling = function (argv, count, factory) {
    this._descendent.across('olio:message', {
        method: 'created',
        argv: argv,
        count: count
    }, factory)
}

Mock.prototype.createReceiver = cadence(function (async, destructible, olio, message, sender) {
    async(function () {
        destructible.monitor('receiver', olio._receiver, message.argv, async())
    }, function (receiver) {
        destructible.destruct.wait(function () { receiver.inbox.push(null) })
        sender.outbox.pump(receiver.inbox)
        receiver.outbox.pump(sender.inbox)
    })
})

Mock.prototype.createSender = cadence(function (async, destructible, from, sender, message, factory, index) {
    async(function () {
        destructible.monitor('sibling', factory, index, sender.count, async())
    }, function (sibling) {
        destructible.destruct.wait(function () { sibling.inbox.push(null) })
        async(function () {
            destructible.monitor('receiver', sender.builder, message.argv, index, message.count, async())
        }, function (receiver) {
            receiver.outbox.pump(sibling.inbox)
            destructible.destruct.wait(function () { receiver.inbox.push(null) })
            sibling.outbox.pump(receiver.inbox)
            sender.receivers[index] = receiver
        })
    })
})

module.exports = Mock
