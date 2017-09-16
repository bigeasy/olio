require('proof')(1, prove)

function prove (okay) {
    var Olio = require('..')
    okay(Olio, 'require')
}
