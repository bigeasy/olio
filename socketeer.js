var Conduit = require('conduit')
var Destructible = require('destructible')
var cadence = require('cadence')
var util = require('util')
var Signal = require('signal')
var stream = require('stream')
var Staccato = require('staccato')
var http = require('http')
var Downgrader = require('downgrader')
var delta = require('delta')
var Interrupt = require('interrupt').createInterrupter('olio')
var coalesce = require('extant')
var Procession = require('procession')

function SocketFactory () {
}

SocketFactory.prototype.createReceiver = cadence(function (async, destructible, Receiver, message, socket) {
    async(function () {
        destructible.monitor('receiver', Receiver, message.from, message.to, async())
    }, function (receiver) {
        destructible.monitor('conduit', Conduit, receiver, socket, socket, async())
    }, function (conduit) {
        conduit.receiver.outbox.push({ module: 'olio', method: 'connect' })
    })
})

module.exports = SocketFactory
