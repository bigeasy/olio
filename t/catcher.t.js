require('proof')(3, require('cadence')(prove))

function prove (async, okay) {
    var expected = [function (level, qualifier, label, entry) {
        okay({
            level: level,
            qualifier: qualifier,
            label: label,
            entry: entry
        }, {
            level: 'error',
            qualifier: 'olio',
            label: 'catcher',
            entry: {
                message: 'message',
                olio: { name: 'run', index: 0 }
            }
        }, 'no end')
    }, function (level, qualifier, label, entry) {
        okay({
            level: level,
            qualifier: qualifier,
            label: label,
            entry: entry
        }, {
            level: 'error',
            qualifier: 'olio',
            label: 'catcher',
            entry: {
                message: 'message',
                olio: { name: 'run', index: 0 }
            }
        }, 'no end')
    }]
    require('prolific.sink').json = function () {
        expected.shift().apply(null, Array.prototype.slice.call(arguments))
    }
    var catcher = require('../catcher')
    async(function () {
        catcher({
            label: 'catcher',
            entry: { olio: { name: 'run', index: 0 } },
            f: function (callback) {
                callback(new Error('message'))
            }
        }, async())
    }, function () {
        catcher({
            label: 'catcher',
            entry: { olio: { name: 'run', index: 0 } },
            f: function (callback) {
                callback(new Error('message'))
            },
            queue: {
                end: function () { okay(true, 'ended') }
            }
        }, async())
    })
}
