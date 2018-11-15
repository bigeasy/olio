var logger = require('prolific.logger').createLogger('olio')

module.exports = function (entry) {
    logger.error(entry.label, entry)
}
