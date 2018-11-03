var cadence = require('cadence')
var http = require('http')
var delta = require('delta')
var destroyer = require('server-destroy')

module.exports = cadence(function (async, destructible, configuration) {
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
