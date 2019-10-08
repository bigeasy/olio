require('proof')(3, async (okay) => {
    const Messenger = require('arguable/messenger')

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

    const messenger = new Messenger
    const child = olio([
        '--application', './test/application.js',
        '--configuration', path.resolve(__dirname, './configuration.js')
    ], {
        messenger: messenger
    })

    // TODO Await a ready property of the program.
    const message = await new Promise(resolve => messenger.parent.once('message', resolve))
    okay(message, 'olio:ready', 'ready')

    const axios = require('axios')

    const ipc = await axios.get('http://127.0.0.1:8081/worker/0/ipc')
    okay(ipc.data, 1, 'ipc')

    const conduit = await axios.get('http://127.0.0.1:8081/worker/0/conduit')
    okay(conduit.data, 1, 'conduit')

    child.destroy()
    await child.promise
})
