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

Mock.prototype.createReceiver = cadence(function (async, olio, message, sender) {
    var receiver = olio._receiver.call(null, message.from.argv, message.from.index)

    var destructible = this._destructible.destructible([ 'receiver', message.from  ])

    sender.read.shifter().pumpify(receiver.write)
    receiver.read.shifter().pumpify(sender.write)
    var receiver = olio._receiver.call(null, message.from.argv, message.from.index)
})

Mock.prototype.createSender = cadence(function (async, from, sender, message, factory, index, destructible) {
    var sink = factory(index, sender.count)
    var source = sender.builder.call(null, message.argv, index, message.count)
    sink.read.shifter().pumpify(source.write)
    source.read.shifter().pumpify(sink.write)
    sender.receivers[index] = { receiver: source }
})

module.exports = Mock
