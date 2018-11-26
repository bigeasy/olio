require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/listen.bin')

    destructible.completed.wait(callback)

    var bin = require('../olio.bin')
    var fs = require('fs')

    try {
        fs.unlinkSync('t/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var program = bin([ '--configuration', './t/configuration.json' ], destructible.monitor('bin'))

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            async(function () {
                program.ready.wait(async())
            }, function () {
                okay('done')
                program.emit('SIGINT')
            })
        })
    })(destructible.monitor('test'))
}
