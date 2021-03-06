module.exports = async function (destructible, olio) {
    await olio.ready('run')
    const once = require('eject')
    const sender = await olio.sender('run')
    const fastify = require('fastify')()
    fastify.get('/worker/:id/conduit', async request => {
        const conduit = sender.hash(request.params.id).conduit
        return await conduit.invoke({ value: 1 })
    })
    fastify.get('/worker/:index/ipc', async request => {
        const promise = once(olio, 'application:response').promise
        await olio.send('run', +request.params.index, 'application:request', 1)
        const [ result ] = await promise
        return result
    })
    await fastify.listen(8081)
    destructible.destruct(() => fastify.close())
    return null
}
