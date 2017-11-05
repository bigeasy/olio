require('proof')(1, require('cadence')(prove))

function prove (async, okay) {
    var Monitor = require('../monitor')
    var children = require('child_process')
    var interrupt = require('interrupt').createInterrupter('olio')
    async(function () {
        var child = children.spawn('node', [ 't/program.js' ], { stdio: 'pipe' })
        Monitor(interrupt, {}, child, async())
        child.kill('SIGINT')
    }, function () {
        var child = children.spawn('node', [ 't/program.js' ], { stdio: 'pipe' })
        Monitor(interrupt, { destroyed: true }, child, async())
        child.kill()
    }, function () {
        okay(true, 'no errors')
    })
}
