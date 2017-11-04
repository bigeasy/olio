require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('../serve.child')
    okay(bin, 'require')
}
