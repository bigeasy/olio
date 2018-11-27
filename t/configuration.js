// Configuration is hack for testing. If you have a bunch of code that depends
// on probing the environment it might be hard to test that code if there is
// nothing variable passed into `configure`.
//
// Of course, the environment is variable, so you could set `process.env` in
// testing and read it in the function, but I don't like to use the environment
// if I don't have to. It invites abuse.
//
// Also you could make life a little easier by having some static properties
// here that the user could set without poking into the `configure` function
// below at all.
exports.configuration = {
    socket: 't/socket'
}

exports.configure = function (configuration) {
    return {
        socket: configuration.socket,
        children: {
            run: {
                workers: 1,
                properties: {
                    path: './t/run.bin.js'
                }
            },
            serve: {
                workers: 1,
                properties: {
                    path: './t/serve.bin.js'
                }
            }
        }
    }
}
