require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Olio = require('..')
    okay(Olio, 'require')

    var bin = require('../olio.bin')
    var fs = require('fs')

    try {
        fs.unlinkSync('t/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var program
    async(function () {
        program = bin([ 'listen' ], {}, async())
        async(function () {
            program.ready.wait(async())
        }, function () {
            program.emit('SIGINT')
        })
    })
}
