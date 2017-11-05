var http = require('http')
var Destructible = require('destructible')
var cadence = require('cadence')
var Signal = require('signal')
var Factory = require('./factory/base')
var util = require('util')
var events = require('events')
var Descendent = require('descendent')

function Mock () {
    Factory.call(this, new events.EventEmitter)
    this._descendent = new Descendent(this.ee)
    this._destructible = new Destructible(5000, 'olio/mock')
    this.ready = new Signal
}
util.inherits(Mock, Factory)

Mock.prototype.initialize = function (argv, index) {
    this._descendent.across('olio:message', {
        method: 'initialize',
        argv: argv,
        index: index
    })
}

Mock.prototype.create = function (argv, count, factory) {
    var receivers = []
    for (var i = 0; i < count; i++) {
        receivers.push(factory(i, count))
    }
    this._descendent.across('olio:message', {
        method: 'created',
        argv: argv,
        count: count
    }, receivers)
}

Mock.prototype.createSender = cadence(function (async, olio, sender, message, receivers, index) {
    //var ready = new Signal
    //ready.unlatch()
    //olio._latches.push(ready)
    var sink = receivers.shift()
    var source = sender.builder.call(null, message.argv, index, message.count)
    sink.read.shifter().pump(source, 'enqueue')
    source.read.shifter().pump(sink, 'enqueue')
    sender.receivers[index] = { receiver: source }
    var wait = async()
    olio._destructible.addDestructor([ 'conduit', message.argv, index ], function () {
        wait()
    })
    console.log('here')
    //ready.unlatch()
})

module.exports = Mock
