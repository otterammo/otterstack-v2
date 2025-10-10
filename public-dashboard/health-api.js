const express = require('express');
const cors = require('cors');
const { fetch } = require('undici');

const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.PUBLIC_DASHBOARD_TIMEOUT_MS || '6000', 10);

const baseDomain = process.env.PUBLIC_DASHBOARD_DOMAIN || 'otterammo.xyz';

function safeUrl(input) {
    try {
        return new URL(input);
    } catch (error) {
        throw new Error(`Invalid service url: ${input}`);
    }
}

function loadServicesFromEnv() {
    if (!process.env.PUBLIC_DASHBOARD_SERVICES) {
        return null;
    }

    try {
        const parsed = JSON.parse(process.env.PUBLIC_DASHBOARD_SERVICES);
        if (!Array.isArray(parsed)) {
            throw new Error('PUBLIC_DASHBOARD_SERVICES must be a JSON array');
        }
        return parsed.map(normalizeService);
    } catch (error) {
        console.error('Failed to parse PUBLIC_DASHBOARD_SERVICES:', error);
        return null;
    }
}

function normalizeService(service) {
    const url = safeUrl(service.url || service.endpoint);
    const id = service.id || url.hostname.replace(/\W+/g, '-');

    return {
        id,
        name: service.name || url.hostname,
        description: service.description || '',
        url: url.toString(),
        displayUrl: service.displayUrl || url.hostname,
        category: service.category || 'Public Services'
    };
}

const DEFAULT_SERVICES = loadServicesFromEnv() || [
    normalizeService({
        id: 'jellyfin',
        name: 'Jellyfin',
        description: 'Stream your personal media library through a modern interface.',
        url: `https://jellyfin.${baseDomain}`
    }),
    normalizeService({
        id: 'jellyseerr',
        name: 'Jellyseerr',
        description: 'Request new shows and movies from the shared catalogue.',
        url: `https://jellyseerr.${baseDomain}`
    })
];

async function probeService(service, attempt = 0, options = {}) {
    const method = attempt === 0 ? 'HEAD' : 'GET';
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = process.hrtime.bigint();

    try {
        const response = await fetch(service.url, {
            method,
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Otterammo-Public-Status/1.0'
            }
        });

        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        if (response.status === 405 && attempt === 0) {
            clearTimeout(timer);
            return probeService(service, attempt + 1, options);
        }

        const online = response.status >= 200 && response.status < 400;

        return {
            online,
            statusCode: response.status,
            latencyMs,
            method,
            error: null
        };
    } catch (error) {
        if (attempt === 0) {
            clearTimeout(timer);
            return probeService(service, attempt + 1, options);
        }

        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const isTimeout = error.name === 'AbortError';

        return {
            online: false,
            statusCode: null,
            latencyMs,
            method,
            error: isTimeout ? 'timeout' : error.message
        };
    } finally {
        clearTimeout(timer);
    }
}

function createApp({
    services = DEFAULT_SERVICES,
    probe = probeService
} = {}) {
    const app = express();
    const serviceList = services.map(normalizeService);
    const serviceMap = new Map(serviceList.map(service => [service.id, service]));

    app.use(cors());

    const noCache = res => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    };

    app.get('/api/ping', (_req, res) => {
        noCache(res);
        res.json({ success: true, timestamp: new Date().toISOString() });
    });

    app.get('/api/services', (_req, res) => {
        noCache(res);
        res.json({ services: serviceList });
    });

    app.get('/api/health', async (_req, res) => {
        noCache(res);

        try {
            const results = await runProbes(Array.from(serviceMap.values()), probe);
            const summary = summarise(results);

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                summary,
                services: results
            });
        } catch (error) {
            console.error('Health aggregation failed:', error);
            res.status(500).json({
                success: false,
                error: 'failed-to-check-services'
            });
        }
    });

    app.get('/api/health/:serviceId', async (req, res) => {
        noCache(res);
        const service = serviceMap.get(req.params.serviceId);

        if (!service) {
            return res.status(404).json({
                success: false,
                error: 'service-not-found'
            });
        }

        try {
            const result = await probe(service);
            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                service: buildServiceResult(service, result)
            });
        } catch (error) {
            console.error(`Probe failed for ${service.id}:`, error);
            res.status(500).json({
                success: false,
                error: 'probe-failed'
            });
        }
    });

    return app;
}

async function runProbes(services, probeFn) {
    const checked = await Promise.all(
        services.map(async service => ({
            service,
            result: await probeFn(service)
        }))
    );

    return checked.map(entry => buildServiceResult(entry.service, entry.result));
}

function buildServiceResult(service, probeOutcome) {
    return {
        id: service.id,
        name: service.name,
        description: service.description,
        url: service.url,
        displayUrl: service.displayUrl,
        category: service.category,
        online: Boolean(probeOutcome.online),
        statusCode: probeOutcome.statusCode,
        latencyMs: typeof probeOutcome.latencyMs === 'number' ? Number(probeOutcome.latencyMs.toFixed(2)) : null,
        checkedAt: new Date().toISOString(),
        method: probeOutcome.method,
        error: probeOutcome.error
    };
}

function summarise(results) {
    const total = results.length;
    const online = results.filter(item => item.online).length;
    const offline = total - online;

    return {
        total,
        online,
        offline,
        uptime: total === 0 ? 100 : Math.round((online / total) * 100)
    };
}

if (require.main === module) {
    const port = Number.parseInt(process.env.PORT || '3002', 10);
    const host = process.env.HOST || '0.0.0.0';
    const app = createApp();

    app.listen(port, host, () => {
        console.log(`Public dashboard health API listening on http://${host}:${port}`);
    });
}

module.exports = {
    createApp,
    DEFAULT_SERVICES,
    probeService
};
