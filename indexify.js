var Keyify = require('keyify')
var fnv = require('hash.fnv')

module.exports = function (index, count) {
    if (typeof index != 'number') {
        var buffer = Buffer.from(Keyify.stringify(index))
        index = fnv(0, buffer, 0, buffer.length) % count
    }
    return index
}
