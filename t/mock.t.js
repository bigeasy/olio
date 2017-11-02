require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Requester = require('conduit/requester')
    var Responder = require('conduit/responder')
    var olio = require('../mock')(function (configuration) {
        configuration.receiver([ 'app', 'command' ], 1, function () {
            return new Requester({
            })
        })
    })
    okay(!!olio.sender([ 'app', 'command' ], 0), 'get')
    okay(olio.count([ 'app', 'command' ]), 1, 'count')
}
