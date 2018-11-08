var cadence = require('cadence')
var logger = require('prolific.logger').createLogger('olio')

module.exports = cadence(function (async, options) {
    async([function () {
        options.f.call(null, async())
    }, function (error) {
        var entry = options.entry
        Object.getOwnPropertyNames(error).forEach(function (name) {
            if (name != 'stack') {
                entry[name] = error[name]
            }
        })
        logger.error(options.label, entry)
        if (options.queue) {
            options.queue.end()
        }
    }])
})
