module.exports = async function (destructible, olio) {
    const once = require('prospective/once')
    const sender = await olio.sender('run')
    const fastify = require('fastify')()
    fastify.get('/worker/:id/conduit', async request => {
        const conduit = sender.hash(request.params.id).conduit
        return await conduit.request({ value: 1 })
    })
    fastify.get('/worker/:index/ipc', async request => {
        olio.send('run', +request.params.index, 'application:request', 1)
        const [ result ] = await once(olio, 'application:response')
        return result
    })
    await fastify.listen(8081)
    destructible.destruct(() => fastify.close())
    return null
}
