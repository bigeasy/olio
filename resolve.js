var path = require('path')

module.exports = function (configuration, require) {
    if (configuration.path) {
        return require(path.resolve.apply(path, [ process.cwd() ].concat(configuration.path)))
    }
    return require(configuration.module)
}
