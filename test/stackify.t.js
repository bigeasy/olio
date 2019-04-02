require('proof')(1, prove)

function prove (okay) {
    var stackify = require('../stackify')
    stackify({
        log: function (level, label, properties) {
            okay({
                level: level,
                label: label,
                stack: !! properties.stack
            }, {
                level: 'error',
                label: 'exception',
                stack: true
            }, 'stackify')
        }
    }, 'exception')(new Error('error'))
}
