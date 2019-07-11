module.exports = async function (destructible, olio) {
    const once = require('prosective/once')
    const sender = await olio.sender('run')
    const fastify = require('fastify')()
    fastify.get('/worker/:id/conduit', async request => {
        return await sender.hash(request.params.id).request({ value: 1 })
    })
    fastify.get('/worker/:index/ipc', async request => {
        olio.send('run', +request.params.index, 'application:request', 1)
        const [ result ] = await once(olio, 'application:response')
        return result
    })
    await fastify.listen(8080)
    destructible.destruct(() => fastify.close())
}
