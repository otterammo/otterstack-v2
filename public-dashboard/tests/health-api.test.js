const test = require('node:test');
const assert = require('node:assert/strict');
const { fetch } = require('undici');
const { createApp } = require('../health-api');

function createServer(t, options = {}) {
    const app = createApp(options);
    const server = app.listen(0);
    t.after(() => server.close());
    const { port } = server.address();
    return { baseUrl: `http://127.0.0.1:${port}` };
}

test('service catalogue endpoint exposes configured services', async t => {
    const services = [
        { id: 'alpha', name: 'Alpha', url: 'https://alpha.example.com', description: 'Alpha service' }
    ];

    const { baseUrl } = createServer(t, { services, probe: async () => ({ online: true, statusCode: 200, latencyMs: 12, method: 'HEAD', error: null }) });

    const response = await fetch(`${baseUrl}/api/services`);
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.ok(Array.isArray(body.services));
    assert.equal(body.services.length, 1);
    assert.equal(body.services[0].id, 'alpha');
    assert.equal(body.services[0].name, 'Alpha');
    assert.equal(body.services[0].displayUrl, 'alpha.example.com');
});

test('health endpoint summarises probe results', async t => {
    const services = [
        { id: 'alpha', name: 'Alpha', url: 'https://alpha.example.com', description: 'Alpha service' },
        { id: 'beta', name: 'Beta', url: 'https://beta.example.com', description: 'Beta service' }
    ];

    const probe = async service => {
        if (service.id === 'alpha') {
            return { online: true, statusCode: 200, latencyMs: 18.4, method: 'HEAD', error: null };
        }
        return { online: false, statusCode: null, latencyMs: 6000, method: 'GET', error: 'timeout' };
    };

    const { baseUrl } = createServer(t, { services, probe });
    const response = await fetch(`${baseUrl}/api/health`);

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.summary.total, 2);
    assert.equal(body.summary.online, 1);
    assert.equal(body.summary.offline, 1);
    assert.equal(Array.isArray(body.services), true);

    const alpha = body.services.find(item => item.id === 'alpha');
    const beta = body.services.find(item => item.id === 'beta');

    assert.equal(alpha.online, true);
    assert.equal(beta.online, false);
    assert.equal(beta.error, 'timeout');
});
