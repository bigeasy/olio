require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var Caller = require('conduit/caller')
    var Procedure = require('conduit/procedure')
    var olio = require('../mock.draft')(function (configuration) {
        configuration.receiver([ 'app', 'command' ], 1, function () {
            return new Caller
        })
    })
    okay(!!olio.sender([ 'app', 'command' ], 0), 'get')
    okay(olio.count([ 'app', 'command' ]), 1, 'count')
}
