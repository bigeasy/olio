require('proof')(1, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/pseudo.t')

    destructible.completed.wait(callback)

    var Pseudo = require('../mock')

    var cadence = require('cadence')

    cadence(function (async) {
        async(function () {
            destructible.monitor('pseudo', Pseudo, {
                socket: 't/socket',
                children: {
                    run: {
                        path: 't/run.bin',
                        workers: 1,
                        properties: {}
                    },
                    serve: {
                        path: 't/serve.bin',
                        workers: 1,
                        properties: {}
                    }
                }
            }, async())
        }, function (children) {
            console.log(children)
            okay(true, 'test')
        })
    })(destructible.monitor('test'))
}
