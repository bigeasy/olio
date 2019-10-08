// Node.js API.
const path = require('path')

const coalesce = require('extant')

const descendant = require('foremost')('descendant')

// Exceptions that you can catch by type.
const Interrupt = require('interrupt').create('olio')

const Registrator = require('./registrator')

const Monitor = require('./monitor')

const cluster = require('cluster')

const assert = require('assert')

class Listener {
    constructor (destructible, configuration) {
        this._destructible = destructible
        this._destructible.destruct(() => this.destroyed = true)
        this.destroyed = false

        this._registrator = {}

        descendant.increment()
        destructible.destructed.then(() => descendant.decrement())

        descendant.on('olio:registered', this._register.bind(this))
        descendant.on('olio:ready', this._ready.bind(this))

        this._constituents = {}

        this._process = process
        this._process.env.OLIO_SUPERVISOR_PROCESS_ID = process.pid
    }

    socket (header, socket) {
        const message = {
            module: 'olio',
            method: 'connect',
            program: header.program,
            to: header.to,
            from: header.from
        }
        require('assert')(message.program.name)
        const path = this._constituents[message.to.name].paths[message.to.index]
        descendant.down(path, 'olio:operate', message, socket)
    }

    _created (count, name, properties, pids) {
        this._constituents[name] = {
            count: count,
            registered: 0,
            ready: 0,
            properties: properties,
            pids: pids,
            paths: []
        }
    }

    _register (message) {
        assert(message.from != null, 'is null ' + JSON.stringify(message.from))
        const process = message.cookie.process, program = message.cookie.program
        this._constituents[process.name].paths[process.index] = message.from
        this._registrator[program.name][program.index].register(process.name, process.index, message.from)
    }

    send (address, message, socket) {
        descendant.down(address, 'olio:operate', message, coalesce(socket))
    }

    get ready () {
        return (async () => {
            for (const program in this._registrator) {
                for (const registrator of this._registrator[program]) {
                    for (const name in registrator.constituents) {
                        await registrator.created.get(name)
                    }
                }
            }
            return true
        })()
    }

    _ready (message) {
        const process = message.cookie.process, program = message.cookie.program
        this._registrator[program.name][program.index].ready(process.name)
    }

    _spawn (destructible, name, config) {
        // TODO Set Node.js arguments.
        const executable = path.join(__dirname, 'constituent.js')
        cluster.setupMaster({ exec: executable, args: [] })
        const workers = coalesce(config.workers, 1)
        const pids = []
        for (let index = 0; index < workers; index++) {
            const worker = cluster.fork({ OLIO_WORKER_INDEX: index })
            descendant.addChild(worker.process, {
                program: { name: 'program', index: 0 },
                process: { name, index }
            })
            const pid = worker.process.pid
            destructible.destruct(descendant.down.bind(descendant, [ pid ], 'olio:shutdown', true))
            pids.push(pid)
            destructible.durable([ 'process', index ], Monitor(Interrupt, this, worker.process, { name, index }))
        }
        this._created(workers, name, config.properties, pids)
    }

    spawn (configuration) {
        this._registrator.program = [ new Registrator(this, { name: 'program', index: 0 }, configuration) ]

        for (const name in configuration.constituents) {
            this._spawn(this._destructible.durable([ 'constituent', name ]), name, configuration.constituents[name])
        }
    }
}

module.exports = Listener
