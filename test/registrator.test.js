describe('registrator', () => {
    const assert = require('assert')
    it('can registrate', () => {
        const sent = [function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 0 ],
                message:  {
                    method: 'initialize',
                    socket: './socket',
                    source: { module: 'example' },
                    program: { name: 'program', index: 0 },
                    name: 'one',
                    index: 0,
                    properties: {},
                    address: [ 'one', 0 ],
                    count: 2,
                    siblings: {
                        one: { properties: {}, count: 2 },
                        two: { properties: {}, count: 1 }
                    }
                }
            }, 'register one 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 0 ],
                message:  {
                    method: 'registered',
                    name: 'one',
                    index: 0,
                    address: [ 'one', 0 ],
                    count: 2
                }
            }, 'registered one 0 learns one 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 1 ],
                message:  {
                    method: 'initialize',
                    socket: './socket',
                    source: { module: 'example' },
                    program: { name: 'program', index: 0 },
                    name: 'one',
                    index: 1,
                    properties: {},
                    address: [ 'one', 1 ],
                    count: 2,
                    siblings: {
                        one: { properties: {}, count: 2 },
                        two: { properties: {}, count: 1 }
                    }
                }
            }, 'register one 1')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 0 ],
                message:  {
                    method: 'registered',
                    name: 'one',
                    index: 1,
                    address: [ 'one', 1 ],
                    count: 2
                }
            }, 'registered one 0 learns one 1')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 1 ],
                message:  {
                    method: 'registered',
                    name: 'one',
                    index: 0,
                    address: [ 'one', 0 ],
                    count: 2
                }
            }, 'registered one 1 learns one 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 1 ],
                message:  {
                    method: 'registered',
                    name: 'one',
                    index: 1,
                    address: [ 'one', 1 ],
                    count: 2
                }
            }, 'registered one 1 learns one 1')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 0 ],
                message:  {
                    method: 'created',
                    name: 'one',
                    addresses: [[ 'one', 0 ], [ 'one', 1 ]],
                    count: 2
                }
            }, 'ready one to one 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 1 ],
                message:  {
                    method: 'created',
                    name: 'one',
                    addresses: [[ 'one', 0 ], [ 'one', 1 ]],
                    count: 2
                }
            }, 'ready one to one 1')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'two', 0 ],
                message:  {
                    method: 'initialize',
                    socket: './socket',
                    source: { path: './example.js' },
                    program: { name: 'program', index: 0 },
                    name: 'two',
                    index: 0,
                    properties: {},
                    address: [ 'two', 0 ],
                    count: 1,
                    siblings: {
                        one: { properties: {}, count: 2 },
                        two: { properties: {}, count: 1 }
                    }
                }
            }, 'register two 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 0 ],
                message:  {
                    method: 'registered',
                    name: 'two',
                    index: 0,
                    address: [ 'two', 0 ],
                    count: 1
                }
            }, 'registered one 0 learns two 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'two', 0 ],
                message:  {
                    method: 'registered',
                    name: 'one',
                    index: 0,
                    address: [ 'one', 0 ],
                    count: 2
                }
            }, 'registered two 0 learns one 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 1 ],
                message:  {
                    method: 'registered',
                    name: 'two',
                    index: 0,
                    address: [ 'two', 0 ],
                    count: 1
                }
            }, 'registered one 1 learns two 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'two', 0 ],
                message:  {
                    method: 'registered',
                    name: 'one',
                    index: 1,
                    address: [ 'one', 1 ],
                    count: 2
                }
            }, 'registered two 0 learns one 1')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'two', 0 ],
                message:  {
                    method: 'created',
                    name: 'one',
                    addresses: [[ 'one', 0 ], [ 'one', 1 ]],
                    count: 2
                }
            }, 'ready one to two 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'two', 0 ],
                message:  {
                    method: 'registered',
                    name: 'two',
                    index: 0,
                    address: [ 'two', 0 ],
                    count: 1
                }
            }, 'registered two 0 learns two 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 0 ],
                message:  {
                    method: 'created',
                    name: 'two',
                    addresses: [[ 'two', 0 ]],
                    count: 1
                }
            }, 'ready one to one 0')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'one', 1 ],
                message:  {
                    method: 'created',
                    name: 'two',
                    addresses: [[ 'two', 0 ]],
                    count: 1
                }
            }, 'ready two to one 1')
        }, function (address, message) {
            assert.deepStrictEqual({
                address: address,
                message: message
            }, {
                address: [ 'two', 0 ],
                message:  {
                    method: 'created',
                    name: 'two',
                    addresses: [[ 'two', 0 ]],
                    count: 1
                }
            }, 'ready two to two 0')
        }]
        const Registrator = require('../registrator')
        const registrator = new Registrator({
            send: function () {
                sent.shift().apply(null, Array.prototype.slice.call(arguments))
            }
        }, {
            name: 'program',
            index: 0
        }, {
            socket: './socket',
            constituents: {
                one: { module: 'example', workers: 2, properties: {} },
                two: { path: './example.js', workers: 1, properties: {} }
            }
        })
        registrator.register('one', 0, [ 'one', 0 ])
        registrator.register('one', 1, [ 'one', 1 ])
        registrator.ready('one')
        registrator.ready('one')
        registrator.register('two', 0, [ 'two', 0 ])
        registrator.ready('two')
    })
})
