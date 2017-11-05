require('proof')(4, prove)

function prove (okay) {
    var Search = require('../search')
    okay(Search('./t/serve.bin.js', null), './t/serve.bin.js', 'relative')
    okay(Search('/usr/local/bin/serve.bin.js', null), '/usr/local/bin/serve.bin.js', 'absolute')
    var path = require('path')
    var PATH = [ '/usr/local/bin', __dirname ].join(path.delimiter)
    okay(!! Search('serve.bin.js', PATH), 'found')
    okay(! Search('steve.bin.js', __dirname), 'not found')
}
