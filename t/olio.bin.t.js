require('proof')(2, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/olio.bin.t')

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

    var UserAgent = require('vizsla')
    var ua = new UserAgent

    var cadence = require('cadence')

    var relative = cadence(function (async, destructible) {
        var program = bin([
            '--application', './t/application.js',
            '--configuration', './t/configuration.js'
        ], destructible.durable('bin'))
        async(function () {
            async(function () {
                program.ready.wait(async())
            }, function () {
                setTimeout(async(), 1000)
            }, function () {
                okay('relative')
                program.emit('SIGINT')
            })
        })
    })

    var path = require('path')
    var absolute = cadence(function (async, destructible) {
        var program = bin([
            '--application', path.resolve(__dirname, './application.js'),
            '--configuration', path.resolve(__dirname, './configuration.js')
        ], destructible.durable('bin'))
        async(function () {
            async(function () {
                program.ready.wait(async())
            }, function () {
                setTimeout(async(), 1000)
            }, function () {
                okay('absolute')
                program.emit('SIGINT')
            })
        })
    })

    cadence(function (async) {
        async(function () {
            destructible.ephemeral('relative', relative, async())
        }, function () {
            setTimeout(async(), 250)
        }, function () {
            destructible.ephemeral('absolute', absolute, async())
        })
    })(destructible.durable('test'))
}
