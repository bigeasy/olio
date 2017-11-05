require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('../serve.child')
    async(function () {
        var program = bin([ '--workers', '1', './t/serve.bin.js' ], {
            env: process.env
        }, async())
        async(function () {
            program.ready.wait(async())
        }, function () {
            program.emit('SIGINT')
        })
    }, function () {
        okay(true, 'ran')
    })
}
