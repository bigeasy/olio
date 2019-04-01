var delta = require('delta')
var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('olio')

module.exports = cadence(function (async, Interrupt, self, child, constituent) {
    async(function () {
        delta(async()).ee(child).on('exit')
    }, function (code, signal) {
        logger.notice('exit', { code: code, signal: signal, constituent: constituent })
    })
})
