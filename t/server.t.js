require('proof')(1, prove)

function prove (okay) {
    var Server = require('../server')
    okay(Server, 'require')
}
