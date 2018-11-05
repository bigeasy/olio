var cadence = require('cadence')
var http = require('http')
var delta = require('delta')
var destroyer = require('server-destroy')

module.exports = cadence(function (async, destructible, binder) {
    async(function () {
        binder.listen(null, async())
    }, function (olio) {
        var shifter = olio.messages.shifter()
        async(function () {
            olio.send(olio.name, olio.index, { sequence: 0 }, async())
        console.log('got olio')
        }, function () {
            console.log('upped')
            shifter.dequeue(async())
        }, function (message) {
            console.log(message)
        })
    }, function () {
        var http = require('http')
        var server = http.createServer(function (request, response) {
            response.writeHead(200, { 'content-type': 'application/json' })
            response.end('"OK"')
        })
        destroyer(server)
        async(function () {
            server.listen(8888, async())
        }, function () {
            destructible.destruct.wait(server, 'destroy')
            delta(destructible.monitor('http')).ee(server).on('close')
        })
    })
})
