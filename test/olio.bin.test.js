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

        // TODO Await a ready property of the program.
        await new Promise(resolve => setTimeout(resolve, 1000))

        const axios = require('axios')

        const ipc = await axios.get('http://127.0.0.1:8081/worker/0/ipc')
        assert.equal(ipc.data, 1, 'ipc')

        const conduit = await axios.get('http://127.0.0.1:8081/worker/0/conduit')
        assert.equal(conduit.data, 1, 'ipc')

        child.destroy()
        await child.promise
    })
})
