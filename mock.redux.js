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

    sender.read.shifter().pump(receiver.write, 'enqueue')
    receiver.read.shifter().pump(sender.write, 'enqueue')
    var receiver = olio._receiver.call(null, message.from.argv, message.from.index)
})

Mock.prototype.createSender = cadence(function (async, olio, sender, message, factory, index) {
    var sink = factory(index, sender.count)
    var source = sender.builder.call(null, message.argv, index, message.count)
    sink.read.shifter().pump(source.write, 'enqueue')
    source.read.shifter().pump(sink.write, 'enqueue')
    sender.receivers[index] = { receiver: source }
    var wait = async()
    olio._destructible.destruct.wait(function () {
        wait()
    })
})

module.exports = Mock
