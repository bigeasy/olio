var fs = require('fs')
var path = require('path')

module.exports = function (command, PATH) {
    if (command[0] != '.' && command[0] != path.sep) {
        command = PATH.split(path.delimiter).map(function (directory) {
            return path.join(directory, command)
        }).filter(function (file) {
            try {
                fs.statSync(file)
                return true
            } catch (e) {
                return false
            }
        }).shift()
    }
    return command
}
