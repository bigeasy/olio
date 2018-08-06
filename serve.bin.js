#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help              display this message
        --name    <string>  name of service
        --workers <string>  socket

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    program.required('name')
    program.stdout.write(JSON.stringify({
        method: 'serve',
        parameters: program.ultimate,
        argv: program.argv
    }) + '\n')
}))
