# OtterStack Smoke Tests

Automated smoke tests to validate the health and functionality of the OtterStack media server.

## Overview

The smoke test suite performs comprehensive checks on:

- **Docker Infrastructure**: Verifies networks and compose configuration
- **Container Status**: Ensures critical containers are running
- **Service Health**: Tests HTTP health endpoints for all services
- **Critical Dependencies**: Validates VPN protection and service connectivity

## Quick Start

### Run Tests Locally

```bash
# Basic smoke test run
./test-stack.sh

# Verbose output (show all test results)
./test-stack.sh -v

# Wait for stack to initialize before testing
./test-stack.sh --wait

# JSON output for CI/CD
./test-stack.sh --json
```

### Via Media Stack Script

```bash
# Integrated with the main management script
./media-stack.sh test
```

## Test Coverage

### Critical Services

These services **must** be healthy for tests to pass:

- Jellyfin (media streaming)
- Jellyseerr (media requests)
- Sonarr (TV show management)
- Radarr (movie management)
- Prowlarr (indexer management)
- qBittorrent (download client)
- Gluetun (VPN container)
- Traefik (reverse proxy)
- Authelia (SSO authentication)
- Redis (session store for Authelia)
- Prometheus (metrics collection)

### Non-Critical Services

These services are checked but won't fail the test suite:

- Bazarr (subtitles)
- Dozzle (log viewer)
- Grafana (dashboards)
- cAdvisor (container metrics)
- Alertmanager (alert routing)

### Infrastructure Checks

- Docker network existence (dmz-net, frontend-net, backend-net, download-net, mgmt-net)
- Docker Compose service status
- Container runtime health

## Usage Examples

### After Stack Startup

```bash
# Start the stack
./media-stack.sh start

# Wait for initialization
sleep 30

# Run smoke tests
./test-stack.sh
```

### Continuous Monitoring

```bash
# Run tests every 5 minutes
watch -n 300 ./test-stack.sh
```

### Pre-Deployment Validation

```bash
# Before deploying changes
./media-stack.sh restart
./test-stack.sh --wait -v
```

## CI/CD Integration

### GitHub Actions

A GitHub Actions workflow is provided at [.github/workflows/smoke-tests.yml](../.github/workflows/smoke-tests.yml).

The workflow:
1. Starts the full stack
2. Waits for service initialization
3. Runs smoke tests with JSON output
4. Uploads test results as artifacts
5. Shows logs on failure

### GitLab CI

```yaml
smoke-test:
  stage: test
  script:
    - docker compose up -d
    - sleep 30
    - ./test-stack.sh --json
  artifacts:
    when: always
    reports:
      junit: test-results.json
```

### Jenkins

```groovy
stage('Smoke Tests') {
    steps {
        sh 'docker compose up -d'
        sh 'sleep 30'
        sh './test-stack.sh --verbose'
    }
    post {
        always {
            sh 'docker compose down'
        }
    }
}
```

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## Test Output

### Normal Mode

```
======================================================================
OtterStack Smoke Tests
======================================================================

[1/4] Checking Docker Infrastructure...
[2/4] Checking Critical Containers...
[3/4] Checking Service Health Endpoints...
[4/4] Checking Critical Dependencies...

======================================================================
Test Summary
======================================================================

Total Tests: 28
Passed: 28
Failed: 0
Pass Rate: 100.0%

Completed in 0.79 seconds
```

### Verbose Mode

Shows each individual test result:

```
✓ PASS Container: traefik (127ms): Up 2 minutes
✓ PASS Container: jellyfin (89ms): Up 2 minutes
✓ PASS Jellyfin (234ms): HTTP 200
✓ PASS Sonarr (156ms): HTTP 200
...
```

### JSON Mode

```json
{
  "total": 28,
  "passed": 28,
  "failed": 0,
  "duration_seconds": 0.79,
  "results": [
    {
      "name": "Jellyfin",
      "passed": true,
      "message": "HTTP 200",
      "duration_ms": 234
    },
    {
      "name": "Authelia",
      "passed": true,
      "message": "HTTP 200",
      "duration_ms": 395
    },
    {
      "name": "Redis",
      "passed": true,
      "message": "PONG response",
      "duration_ms": 174
    }
  ]
}
```

## Troubleshooting

### Tests Failing After Stack Restart

Services may need more time to initialize:

```bash
./test-stack.sh --wait
```

### Specific Service Failures

Check individual service logs:

```bash
./media-stack.sh logs <service-name>
```

### Docker Network Issues

Recreate networks:

```bash
docker compose down
./media-stack.sh network-create
docker compose up -d
```

### Permission Issues

Ensure scripts are executable:

```bash
chmod +x test-stack.sh
chmod +x tests/smoke_test.py
```

## Customization

### Adding New Services

Edit [tests/smoke_test.py](smoke_test.py) and add to the `SERVICES` list:

```python
# HTTP health endpoint
{
    'name': 'MyService',
    'container': 'myservice',
    'port': 8080,
    'path': '/health',
    'critical': True  # or False
}

# Native healthcheck command
{
    'name': 'MyService',
    'container': 'myservice',
    'native_healthcheck': True,
    'critical': True
}

# Custom check (like Redis)
{
    'name': 'MyService',
    'container': 'myservice',
    'redis_check': True,  # or custom_check: True
    'critical': True
}
```

### Adjusting Timeouts

Modify the `TIMEOUT_SECONDS` constant in [smoke_test.py](smoke_test.py):

```python
TIMEOUT_SECONDS = 10  # Default is 5
```

### Custom Health Endpoints

Update the service URL to include the health endpoint path:

```python
'url': 'http://localhost:8989/api/v1/health'
```

## Performance

- **Typical runtime**: 2-5 seconds
- **Parallel execution**: Up to 10 concurrent health checks
- **Timeout per check**: 5 seconds
- **Network overhead**: Minimal (localhost HTTP requests)

## Requirements

- Python 3.6 or higher
- Docker and Docker Compose
- Network access to localhost service ports

## Contributing

When adding new services to the stack:

1. Add the service to the `SERVICES` list
2. Specify a health endpoint if available
3. Mark as `critical: True` if it's essential for stack operation
4. Test with `./test-stack.sh -v` to verify

## License

Part of the OtterStack project. See main repository for license details.
