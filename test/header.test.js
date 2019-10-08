require('proof')(2, async (okay) => {
    const Header = require('../header')
    const stream = require('stream')
    {
        const buffer = Buffer.from(JSON.stringify({ a: 1 }) + '\n')
        const through = new stream.PassThrough
        const promise = Header(through)
        through.write(buffer.slice(0, 2))
        await new Promise(resolve => setImmediate(resolve))
        through.write(buffer.slice(2))
        okay(await promise, { a: 1 }, 'can parse header')
    }
    {
        const buffer = Buffer.from(JSON.stringify({ a: 1 }) + '\n')
        const through = new stream.PassThrough
        const promise = Header(through)
        through.write(buffer.slice(0, 2))
        await new Promise(resolve => setImmediate(resolve))
        through.end()
        okay(await promise, null, 'can deal with truncation')
    }
})
