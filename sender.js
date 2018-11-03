var fnv = require('hash.fnv')

function Sender (receivers, paths, count) {
    this.processes = []
    for (var i = 0; i < count; i++) {
        this.processes.push({ sender: receivers[i], path: paths[i], index: i })
    }
    this.count = count
}

Sender.prototype.hash = function (key) {
    var buffer = Buffer.from(Keyify.stringify(key))
    return this.processes[fnv(0, buffer, 0, buffer.length) % this.count]
}

module.exports = Sender
