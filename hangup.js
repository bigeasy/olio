var logger = require('prolific.logger').createLogger('olio')

module.exports = function (error) {
    logger.error('hangup', { stack: error.stack })
}
