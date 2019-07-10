const logger = require('prolific.logger').createLogger('olio')
const once = require('prospective/once')

module.exports = async function (Interrupt, self, child, constituent) {
    try {
        const [ code, signal ] = await once(child, 'exit')
        logger.notice('exit', { code: code, signal: signal, constituent: constituent })
    } catch (error) {
        logger.error('exit', { stack: error.stack, constituent: constituent })
    }
}
