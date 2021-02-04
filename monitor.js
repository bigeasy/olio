const logger = require('prolific.logger').create('olio')
const once = require('eject')

module.exports = async function (self, child, constituent) {
    if (arguments.length == 4) {
        throw new Error
    }
    try {
        const [ code, signal ] = await once(child, 'exit').promise
        logger.notice('exit', { code: code, signal: signal, constituent: constituent })
    } catch (error) {
        logger.error('exit', { stack: error.stack, constituent: constituent })
    }
}
