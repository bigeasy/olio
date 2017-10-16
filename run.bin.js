#!/usr/bin/env node

/*
    ___ usage ___ en_US ___

    usage: olio <socket> [command] <args>

        --help              display this message
        --workers <string>  socket

    ___ $ ___ en_US ___

    unknown argument:
        unknown argument: %s

    ___ . ___
 */
require('arguable')(module, require('cadence')(function (async, program) {
    program.stdout.write(JSON.stringify({
        method: 'run',
        parameters: program.ultimate,
        argv: program.argv
    }) + '\n')
}))
