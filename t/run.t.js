require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('../run.bin')

    var program
    async(function () {
        program = bin([ '--name', 'steve', '--workers', '3', 'node', 'child.js' ], {}, async())
    }, function () {
        okay(JSON.parse(program.stdout.read().toString()), {
            method: 'run',
            parameters: { name: 'steve', workers: '3' },
            argv: [ 'node', 'child.js' ]
        }, 'json')
    })
}
