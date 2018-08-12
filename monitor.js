var delta = require('delta')
var cadence = require('cadence')

module.exports = cadence(function (async, Interrupt, self, child) {
    async(function () {
        delta(async()).ee(child).on('exit')
    }, function (code, signal) {
        Interrupt.assert(self.destroyed || signal == 'SIGINT', 'subordinate.exit', { code: code, signal: signal })
    })
})
