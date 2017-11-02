var coalesce = require('extant')
var Map = require('./map')
var indexify = require('./indexify')

function Configuration (olio) {
    this._olio = olio
}

Configuration.prototype.receiver = function (argv, count, builder) {
    count = coalesce(count, 1)
    var receivers = []
    for (var i = 0; i < count; i++) {
        receivers.push(builder(argv, i, count))
    }
    this._olio._map.push(argv, { count: count, receivers: receivers })
}

function Mock () {
    this._map = new Map
}

Mock.prototype.sender = function (argv, index) {
    var entry = this._map.get(argv)
    index = indexify(index, entry.count)
    return entry.receivers[index]
}

Mock.prototype.count = function (argv) {
    return this._map.get(argv).count
}

module.exports = function (configurator) {
    var olio = new Mock
    var configuration = new Configuration(olio)
    configurator(configuration)
    return olio
}
