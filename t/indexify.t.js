require('proof')(2, prove)

function prove (okay) {
    var indexify = require('../indexify')
    okay(indexify(1, 3), 1, 'number')
    okay(indexify({ a: 1 }, 3), 2, 'hash')
}
