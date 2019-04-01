require('proof')(1, prove)

function prove (okay) {
    var hangup = require('../hangup')

    require('prolific.sink').json = function (level, qualifier, label, entry) {
        okay({
            level: level,
            qualifier: qualifier,
            label: label,
            entry: entry
        }, {
            level: 'error',
            qualifier: 'olio',
            label: 'hangup',
            entry: { stack: 'stack' }
        }, 'error')
    }
    hangup({ stack: 'stack' })
}
