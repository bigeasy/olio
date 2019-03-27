require('proof')(2, require('cadence')(prove))

function prove (async, okay) {
    var bin = require('../olio.bin')
    var fs = require('fs')

    try {
        fs.unlinkSync('test/socket')
    } catch (e) {
        if (e.code != 'ENOENT') {
            throw e
        }
    }

    var path = require('path')

    async(function () {
        bin([
            '--application', './test/application.js',
            '--configuration', './test/configuration.js'
        ], async())
    }, function (child) {
        setTimeout(child.destroy.bind(child), 1000)
        child.exit(async())
    }, function (exitCode) {
        okay(exitCode, 0, 'relative')
        bin([
            '--application', path.resolve(__dirname, './application.js'),
            '--configuration', path.resolve(__dirname, './configuration.js')
        ], async())
    }, function (child) {
        setTimeout(child.destroy.bind(child), 1000)
        child.exit(async())
    }, function (exitCode) {
        okay(exitCode, 0, 'relative')
    })
}
