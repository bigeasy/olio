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
        var program = bin([ '--configuration', './t/configuration.js' ], destructible.monitor('bin'))
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
            '--configuration', path.resolve(__dirname, './configuration.js')
        ], destructible.monitor('bin'))
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
            destructible.monitor('relative', true, relative, async())
        }, function () {
            setTimeout(async(), 250)
        }, function () {
            destructible.monitor('absolute', true, absolute, async())
        })
    })(destructible.monitor('test'))
}
