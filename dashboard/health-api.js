const express = require('express');
const cors = require('cors');
const net = require('net');
const app = express();

app.use(cors());
app.use(express.json());

// Service configuration
const services = {
    jellyfin: { port: 8096, name: 'Jellyfin' },
    jellyseerr: { port: 5055, name: 'Jellyseerr' },
    sonarr: { port: 8989, name: 'Sonarr' },
    radarr: { port: 7878, name: 'Radarr' },
    prowlarr: { port: 9696, name: 'Prowlarr' },
    bazarr: { port: 6767, name: 'Bazarr' },
    qbittorrent: { port: 8080, name: 'qBittorrent' },
    traefik: { port: 8090, name: 'Traefik' },
    grafana: { port: 3001, name: 'Grafana' },
    prometheus: { port: 9090, name: 'Prometheus' },
    cadvisor: { port: 8081, name: 'cAdvisor' },
    dozzle: { port: 9999, name: 'Dozzle' }
};

// Check if a port is open
function checkPort(host, port, timeout = 3000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        const onConnect = () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(true);
            }
        };

        const onError = () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(false);
            }
        };

        const onTimeout = () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve(false);
            }
        };

        socket.setTimeout(timeout);
        socket.once('connect', onConnect);
        socket.once('error', onError);
        socket.once('timeout', onTimeout);

        socket.connect(port, host);
    });
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const host = req.query.host || '192.168.86.111';
    const results = {};
    
    try {
        // Check all services in parallel
        const checks = Object.entries(services).map(async ([serviceId, config]) => {
            const isOnline = await checkPort(host, config.port);
            return {
                serviceId,
                isOnline,
                name: config.name,
                port: config.port,
                timestamp: new Date().toISOString()
            };
        });

        const serviceResults = await Promise.all(checks);
        
        // Organize results
        serviceResults.forEach(result => {
            results[result.serviceId] = {
                online: result.isOnline,
                name: result.name,
                port: result.port,
                lastChecked: result.timestamp
            };
        });

        // Calculate summary stats
        const total = Object.keys(results).length;
        const online = Object.values(results).filter(r => r.online).length;
        const offline = total - online;

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            host: host,
            summary: {
                total,
                online,
                offline,
                percentage: Math.round((online / total) * 100)
            },
            services: results
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Single service check endpoint
app.get('/api/health/:service', async (req, res) => {
    const { service } = req.params;
    const host = req.query.host || '192.168.86.111';
    
    if (!services[service]) {
        return res.status(404).json({
            success: false,
            error: 'Service not found'
        });
    }

    try {
        const config = services[service];
        const isOnline = await checkPort(host, config.port);
        
        res.json({
            success: true,
            service: service,
            name: config.name,
            port: config.port,
            online: isOnline,
            host: host,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Health check error for ${service}:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// System info endpoint
app.get('/api/system', (req, res) => {
    const os = require('os');
    
    res.json({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        },
        cpus: os.cpus().length,
        loadavg: os.loadavg(),
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Health check API running on port ${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  GET /api/health - Check all services`);
    console.log(`  GET /api/health/:service - Check specific service`);
    console.log(`  GET /api/system - System information`);
});