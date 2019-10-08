// Node.js API.
const net = require('net')

const coalesce = require('extant')

// Generate a unique, canonical string key from a JSON object.
const Keyify = require('keyify')

const events = require('events')

const logger = require('prolific.logger').create('olio')

const Conduit = require('conduit')
const Staccato = require('staccato')
const Avenue = require('avenue')
const Serialize = require('avenue/serialize')
const Deserialize = require('avenue/deserialize')

const Header = require('./header')
const Sender = require('./sender')

const Interrupt = require('interrupt')

class Olio extends events.EventEmitter {
    constructor (destructible, dispatcher, message) {
        super()
        this.destroyed = false

        this._destructible = destructible
        this._destructible.destruct(() => this.destroyed = true)

        this._ready = dispatcher.ready
        this._registered = dispatcher.registered

        require('assert')(message.program)
        this.program = message.program
        this.name = message.name
        this.index = message.index
        this.address = message.address
        this.socket = message.socket
        this.siblings = message.siblings

        this._transmitter = dispatcher.transmitter

        destructible.destruct(() => {
            this._ready.destroy(new Olio.Error('unready', { latched: this._ready.latched }))
            this._registered.destroy(new Olio.Error('unregistered', { latched: this._registered.latched }))
        })

        events.EventEmitter.call(this)
    }

    async send (name, index, messageName, message, handle) {
        if (this.destroyed) {
            if (handle != null) {
                handle.destroy()
            }
        } else {
            const registered = await this._registered.get(Keyify.stringify([ name, index ]))
            this._transmitter.kibitz(registered.address, {
                name: messageName,
                body: message
            }, coalesce(handle))
        }
    }

    async broadcast (name, eventName, message) {
        if (!this.destroyed) {
            for (let i = 0; i < this.siblings[name].count; i++) {
                const registered = await this._registered.get(Keyify.stringify([ name, i ]))
                this._transmitter.kibitz(registered.address, {
                    name: eventName,
                    body: message
                }, null)
            }
        }
    }

    // Doesn't seem necessary. Especially if we do not actually build until
    // everything is ready.

    //
    ready (name) {
        return this._ready.get(name)
    }

    async sender (name, ...vargs) {
        const sibling = await this._ready.get(name)
        const receivers = []
        for (let i = 0; i < sibling.count; i++) {
            const destructible = this._destructible.durable([ 'sender', sibling.name, i ])
            const socket = net.connect(this.socket)
            socket.on('error', logger.stackTrace({ sibling: sibling }))
            socket.on('close', () => destructible.destroy())
            socket.write(JSON.stringify({
                program: {
                    name: this.program.name,
                    index: this.program.index
                },
                to: {
                    name: sibling.name,
                    index: i,
                },
                from: {
                    name: this.name,
                    index: this.index
                }
            }) + '\n')
            const deployed = await Header(socket)
            Olio.Error.assert(deployed != null && deployed.module == 'olio' && deployed.method == 'connect', 'failed to start middleware')
            const inbox = new Avenue, outbox = new Avenue
            destructible.durable('deserialize', Deserialize(new Staccato.Readable(socket), inbox))
            destructible.destruct(() => socket.destroy())
            destructible.durable('serialize', Serialize(outbox.shifter(), new Staccato.Writable(socket)))
            destructible.destruct(() => outbox.push(null))
            const client = receivers[i] = new Conduit(destructible.durable('conduit'), inbox.shifter(), outbox)
        }
        return new Sender(receivers, sibling.addresses, sibling.count)
    }

    static Error = Interrupt.create('Olio.Error')
}

// TODO You're working through this right now.
//
// If one of our sender creators raises an error, we are ready with the error.
// Our destructible will gather up any other waiting initialzers, so that we
// will still get a full bouquet of errors through the destructible. We're
// turnign the corner here, you see, with an initialization stack that is
// waiting on the Olio constructor and multiple senders. Ready is not waiting on
// receivers, it waiting for all senders to be ready. Thus, we go forward when
// we have all our senders. We can still error building a receiver, though.
// (Let's put this in our unit tests.)
//
// Ordered thoughts.
//
// * We are waiting for all our senders to be ready because we cannot use the
// Olio until all the senders are ready.
// * Waiting on receivers is probably a function of having a countdow latch
// elsewhere that is waiting for incoming signals. Not a use case I've
// encountered yet though.
// * An error initializing a sender will cause us to be ready, but we report
// ready by passing the error.

//

module.exports = Olio
