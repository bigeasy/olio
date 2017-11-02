var Keyify = require('keyify')

function Map () {
    this._objects = { map: {}, array: [] }
}

Map.prototype.push = function (argv, object) {
    this._objects.array.push({ argv: argv, object: object })
}

Map.prototype.get = function (argv) {
    var key = Keyify.stringify(argv)
    var entry
    if (entry = this._objects.map[key]) {
        return entry
    }
    LINKS: for (var i = 0, entry; (entry = this._objects.array[i]) != null; i++) {
        if (entry.argv.length <= argv.length) {
            for (var j = 0; j < entry.argv.length; j++) {
                if (entry.argv[j] != argv[j]) {
                    continue LINKS
                }
            }
            return this._objects.map[key] = entry.object
        }
    }
    return null
}

module.exports = Map
