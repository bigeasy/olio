describe('resolve', () => {
    const assert = require('assert')
    const resolve = require('../resolve')
    it('can resolve', () => {
        assert.equal(resolve({ path: './test/resolved.js' }, require).value, 1, 'resolve path with extension')
        assert.equal(resolve({ path: './test/resolved' }, require).value, 1, 'resolve path no extension')
        assert.equal(resolve({ module: './resolved' }, require).value, 1, 'resolve as module')
    })
})
