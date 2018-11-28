require('proof')(3, prove)

function prove (okay, callback) {
    var Destructible = require('destructible')
    var destructible = new Destructible('t/pseudo.t')

    destructible.completed.wait(callback)

    var Mock = require('../mock')

    var cadence = require('cadence')

    var UserAgent = require('vizsla')
    var ua = new UserAgent

    cadence(function (async) {
        async(function () {
            destructible.monitor('mock', Mock, {
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
            console.log('--- children ---')
            ua.fetch({
                url: '/',
                socketPath: './t/socket',
                parse: 'text',
                raise: true
            }, async())
        }, function (body, response) {
            okay(body, 'Olio Mock API\n', 'index')
            ua.fetch({
                url: 'http://127.0.0.1:8888/worker/0/conduit',
                parse: 'json',
                post: {}
            }, async())
        }, function (body, response) {
            okay(body, 1, 'conduit')
            ua.fetch({
                url: 'http://127.0.0.1:8888/worker/0/ipc',
                parse: 'json',
                post: {}
            }, async())
        }, function (body, response) {
            okay(body, 0, 'ipc')
        })
    })(destructible.monitor('test'))
}
