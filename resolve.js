var path = require('path')

module.exports = function (configuration, require) {
    if (configuration.path) {
        return require(path.resolve(process.cwd(), configuration.path))
    }
    return require(configuration.module)
}
