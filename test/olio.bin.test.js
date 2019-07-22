describe('olio.bin', () => {
    const assert = require('assert')
    it('can launch', async () => {
        const olio = require('../olio.bin')
        const fs = require('fs').promises

        try {
            await fs.unlink('test/socket')
        } catch (e) {
            if (e.code != 'ENOENT') {
                throw e
            }
        }

        const path = require('path')

        const child = olio([
            '--application', './test/application.js',
            '--configuration', path.resolve(__dirname, './configuration.js')
        ])
        setTimeout(() => child.destroy(), 1000)
        await child.promise
    })
})
