const logger = require('prolific.logger').create('olio')
const once = require('prospective/once')

module.exports = async function (Interrupt, self, child, constituent) {
    try {
        const [ code, signal ] = await once(child, 'exit').promise
        logger.notice('exit', { code: code, signal: signal, constituent: constituent })
    } catch (error) {
        logger.error('exit', { stack: error.stack, constituent: constituent })
    }
}
