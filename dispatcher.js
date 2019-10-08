const Cubbyhole = require('cubbyhole')

const Future = require('prospective/future')

const Staccato = require('staccato')
const Conduit = require('conduit')

const Avenue = require('avenue')
const Serialize = require('avenue/serialize')
const Deserialize  = require('avenue/deserialize')

const Olio = require('./olio')

const Keyify = require('keyify')

const logger = require('prolific.logger').create('olio')

// TODO It makes more sense to wait for all the children to register before
// returning the Olio so that we at least know that that much is working and so
// that a failed startup doesn't report in user code if it doesn't have to.

class Dispatcher {
    constructor (destructible, transmitter) {
        this._destructible = destructible
        this.olio = new Future
        this.transmitter = transmitter
        this.destructible = destructible
        this.destroyed = false
        destructible.destruct(() => this.destroyed = true)
        this.ready = new Cubbyhole
        this.registered = new Cubbyhole
    }

    async fromSibling (message, socket) {
        const [ olio ] = await this.olio.promise
        olio.emit(message.name, message.body, socket)
        return null
    }

    // TODO Add PQueue.
    async fromParent (message, socket) {
        if (this.destroyed) {
            if (socket != null) {
                socket.destroy()
            }
            return
        }
        switch (message.method) {
        case 'initialize': {
                const destructible = this._destructible.durable('olio')
                this.olio.resolve([ new Olio(destructible, this, message), message.source, message.properties ])
            }
            break
        case 'registered': {
                this.registered.set(Keyify.stringify([ message.name, message.index ]), {
                    name: message.name,
                    index: message.index,
                    address: message.address,
                    count: message.count
                })
            }
            break
        case 'connect': {
                // TODO This is also swallowing errors somehow.
                const destructible = this.destructible.durable([
                    'receiver', message.from.name, message.from.index
                ])
                socket.on('error', logger.stackTrace({ message: message }))
                socket.on('close', () => destructible.destroy())
                const inbox = new Avenue, outbox = new Avenue
                destructible.durable('deserialize', Deserialize(new Staccato.Readable(socket), inbox))
                destructible.durable('serialize', Serialize(outbox.shifter(), new Staccato.Writable(socket)))
                destructible.destructed.then(() => socket.destroy())
                const conduit = new Conduit(destructible.durable('conduit'), inbox.shifter(), outbox, this.receiver)
                socket.write(JSON.stringify({ module: 'olio', method: 'connect' }) + '\n')
            }
            break
        case 'created': {
                this.ready.set(message.name, {
                    name: message.name,
                    addresses: message.addresses,
                    count: message.count
                })
            }
            break
        }
    }
}

module.exports = Dispatcher
