const Keyify = require('keyify')
const fnv = require('hash.fnv')

class Sender {
    constructor (receivers, paths, count) {
        this.processes = []
        for (var i = 0; i < count; i++) {
            this.processes.push({ conduit: receivers[i], path: paths[i], index: i })
        }
        this.count = count
    }

    hash (key) {
        const buffer = Buffer.from(Keyify.stringify(key))
        return this.processes[fnv(0, buffer, 0, buffer.length) % this.count]
    }
}

module.exports = Sender
