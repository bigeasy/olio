var coalesce = require('extant')
module.exports = function (logger, label, level) {
    return function (error) {
        logger.log(coalesce(level, 'error'), label, { stack: error.stack })
    }
}
