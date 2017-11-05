require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('../serve.bin')

    var program
    async(function () {
        program = bin([ '--workers', '3', 'node', 'child.js' ], {}, async())
    }, function () {
        okay(JSON.parse(program.stdout.read().toString()), {
            method: 'serve',
            parameters: { workers: '3' },
            argv: [ 'node', 'child.js' ]
        }, 'json')
    })
}