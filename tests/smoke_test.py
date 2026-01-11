#!/usr/bin/env python3
"""
OtterStack Automated Smoke Tests

Tests critical functionality of the media server stack:
- Service availability via health checks
- Docker container status
- Network connectivity
- Critical service dependencies
"""

import sys
import time
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple, Optional

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

# Test configuration
TIMEOUT_SECONDS = 5
MAX_WORKERS = 10

# Service definitions with health endpoints
# Using container names and internal ports to bypass Traefik
SERVICES = [
    # Public Services
    {'name': 'Jellyfin', 'container': 'jellyfin', 'port': 8096, 'path': '/health', 'critical': True},
    {'name': 'Jellyseerr', 'container': 'jellyseerr', 'port': 5055, 'path': '/api/v1/status', 'critical': True},

    # Media Management (Backend)
    {'name': 'Sonarr', 'container': 'sonarr', 'port': 8989, 'path': '/ping', 'critical': True},
    {'name': 'Radarr', 'container': 'radarr', 'port': 7878, 'path': '/ping', 'critical': True},
    {'name': 'Prowlarr', 'container': 'prowlarr', 'port': 9696, 'path': '/ping', 'critical': True},
    {'name': 'Bazarr', 'container': 'bazarr', 'port': 6767, 'path': '/ping', 'critical': False},

    # Download (qBittorrent runs through Gluetun's network)
    {'name': 'qBittorrent', 'container': 'gluetun', 'port': 8080, 'path': '/', 'critical': True},

    # Infrastructure (Traefik ping is on web entrypoint port 80, Dozzle uses native healthcheck)
    {'name': 'Traefik', 'container': 'traefik', 'port': 80, 'path': '/ping', 'critical': True},
    {'name': 'Dozzle', 'container': 'dozzle', 'native_healthcheck': True, 'critical': False},

    # Security & Authentication
    {'name': 'Authelia', 'container': 'authelia', 'port': 9091, 'path': '/api/health', 'critical': True},
    {'name': 'Redis', 'container': 'authelia-redis', 'redis_check': True, 'critical': True},

    # Monitoring
    {'name': 'Grafana', 'container': 'grafana', 'port': 3000, 'path': '/api/health', 'critical': False},
    {'name': 'Prometheus', 'container': 'prometheus', 'port': 9090, 'path': '/-/healthy', 'critical': True},
    {'name': 'cAdvisor', 'container': 'cadvisor', 'port': 8080, 'path': '/healthz', 'critical': False},
    {'name': 'Alertmanager', 'container': 'alertmanager', 'port': 9093, 'path': '/-/healthy', 'critical': False},
]

# Critical Docker containers that must be running
CRITICAL_CONTAINERS = [
    'traefik',
    'authelia',
    'authelia-redis',
    'jellyfin',
    'sonarr',
    'radarr',
    'prowlarr',
    'gluetun',
    'qbittorrent',
    'prometheus',
]


class TestResult:
    """Stores the result of a test"""
    def __init__(self, name: str, passed: bool, message: str = "", duration_ms: Optional[int] = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.duration_ms = duration_ms

    def __repr__(self):
        status = f"{GREEN}✓ PASS{RESET}" if self.passed else f"{RED}✗ FAIL{RESET}"
        duration = f" ({self.duration_ms}ms)" if self.duration_ms else ""
        msg = f": {self.message}" if self.message else ""
        return f"{status} {self.name}{duration}{msg}"


def check_service_health(service: Dict) -> TestResult:
    """Check if a service is responding to health checks using docker exec"""
    name = service['name']
    container = service['container']

    # Handle Redis using redis-cli PING
    if service.get('redis_check'):
        start_time = time.time()
        try:
            result = subprocess.run(
                ['docker', 'exec', container, 'redis-cli', 'PING'],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS
            )
            duration_ms = int((time.time() - start_time) * 1000)
            if result.returncode == 0 and 'PONG' in result.stdout:
                return TestResult(name, True, "PONG response", duration_ms)
            else:
                return TestResult(name, False, "No PONG response", duration_ms)
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return TestResult(name, False, f"Error: {str(e)}"[:50], duration_ms)

    # Handle services with native healthcheck commands
    if service.get('native_healthcheck'):
        start_time = time.time()
        try:
            result = subprocess.run(
                ['docker', 'exec', container, '/dozzle', 'healthcheck'],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS
            )
            duration_ms = int((time.time() - start_time) * 1000)
            if result.returncode == 0:
                return TestResult(name, True, "Native healthcheck OK", duration_ms)
            else:
                return TestResult(name, False, "Native healthcheck failed", duration_ms)
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return TestResult(name, False, f"Error: {str(e)}"[:50], duration_ms)

    port = service['port']
    path = service['path']
    url = f"http://localhost:{port}{path}"

    start_time = time.time()
    try:
        # Try curl first, fall back to wget if curl is not available
        # This bypasses Traefik routing and tests the service directly

        # Try curl
        result = subprocess.run(
            ['docker', 'exec', container, 'curl', '-sf', '-o', '/dev/null', '-w', '%{http_code}', url],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS
        )

        # If curl not found (exit code 127), try wget
        if result.returncode == 127 or 'executable file not found' in result.stderr:
            result = subprocess.run(
                ['docker', 'exec', container, 'wget', '-q', '-O', '/dev/null', '--server-response', url],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS
            )

            duration_ms = int((time.time() - start_time) * 1000)

            # wget returns 0 on success (2xx), non-zero on failure
            if result.returncode == 0:
                # Parse status code from stderr (wget outputs to stderr)
                status_match = None
                for line in result.stderr.split('\n'):
                    if 'HTTP/' in line:
                        parts = line.split()
                        if len(parts) >= 2:
                            status_match = parts[1]
                            break

                status_code = status_match if status_match else "200"
                return TestResult(name, True, f"HTTP {status_code}", duration_ms)
            else:
                # Check if it's an auth error (wget still fails but we see 401/403 in output)
                if '401' in result.stderr or '403' in result.stderr:
                    return TestResult(name, True, "HTTP 401/403 (auth required)", duration_ms)
                return TestResult(name, False, "Connection failed", duration_ms)

        duration_ms = int((time.time() - start_time) * 1000)

        if result.returncode == 0:
            status_code = result.stdout.strip()
            if status_code.startswith('2'):  # 2xx status codes
                return TestResult(name, True, f"HTTP {status_code}", duration_ms)
            elif status_code in ['401', '403']:
                # Auth required is OK - service is responding
                return TestResult(name, True, f"HTTP {status_code} (auth required)", duration_ms)
            else:
                return TestResult(name, False, f"HTTP {status_code}", duration_ms)
        else:
            # curl failed - likely connection refused or timeout
            error_msg = result.stderr.strip() if result.stderr else "Connection failed"
            return TestResult(name, False, error_msg[:50], duration_ms)

    except subprocess.TimeoutExpired:
        duration_ms = int((time.time() - start_time) * 1000)
        return TestResult(name, False, "Timeout", duration_ms)
    except FileNotFoundError:
        duration_ms = int((time.time() - start_time) * 1000)
        return TestResult(name, False, "Docker not found", duration_ms)
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return TestResult(name, False, f"Error: {str(e)}"[:50], duration_ms)


def check_docker_container(container_name: str) -> TestResult:
    """Check if a Docker container is running"""
    try:
        result = subprocess.run(
            ['docker', 'ps', '--filter', f'name={container_name}', '--format', '{{.Status}}'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0 and result.stdout.strip():
            status = result.stdout.strip()
            if status.startswith('Up'):
                return TestResult(f"Container: {container_name}", True, status.split('\n')[0])
            else:
                return TestResult(f"Container: {container_name}", False, f"Not running: {status}")
        else:
            return TestResult(f"Container: {container_name}", False, "Not found")

    except subprocess.TimeoutExpired:
        return TestResult(f"Container: {container_name}", False, "Docker command timeout")
    except FileNotFoundError:
        return TestResult(f"Container: {container_name}", False, "Docker not found")
    except Exception as e:
        return TestResult(f"Container: {container_name}", False, f"Error: {str(e)}")


def check_docker_networks() -> TestResult:
    """Verify critical Docker networks exist"""
    required_networks = ['dmz-net', 'frontend-net', 'backend-net', 'download-net', 'mgmt-net']

    try:
        result = subprocess.run(
            ['docker', 'network', 'ls', '--format', '{{.Name}}'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return TestResult("Docker Networks", False, "Failed to list networks")

        existing_networks = result.stdout.strip().split('\n')
        missing = [net for net in required_networks if not any(net in existing for existing in existing_networks)]

        if not missing:
            return TestResult("Docker Networks", True, f"All {len(required_networks)} networks exist")
        else:
            return TestResult("Docker Networks", False, f"Missing: {', '.join(missing)}")

    except Exception as e:
        return TestResult("Docker Networks", False, f"Error: {str(e)}")


def check_compose_services() -> TestResult:
    """Verify docker compose can list services"""
    try:
        result = subprocess.run(
            ['docker', 'compose', 'ps', '--format', 'json'],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return TestResult("Docker Compose", False, "Failed to query services")

        # Parse JSON output
        services = []
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    services.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

        running_count = sum(1 for s in services if s.get('State') == 'running')
        total_count = len(services)

        if running_count == total_count and total_count > 0:
            return TestResult("Docker Compose", True, f"{running_count}/{total_count} services running")
        else:
            return TestResult("Docker Compose", False, f"Only {running_count}/{total_count} services running")

    except Exception as e:
        return TestResult("Docker Compose", False, f"Error: {str(e)}")


def run_smoke_tests(verbose: bool = False) -> Tuple[List[TestResult], List[TestResult]]:
    """Run all smoke tests and return passed and failed results"""

    print(f"\n{BOLD}{BLUE}{'='*70}{RESET}")
    print(f"{BOLD}{BLUE}OtterStack Smoke Tests{RESET}")
    print(f"{BOLD}{BLUE}{'='*70}{RESET}\n")

    all_results = []

    # 1. Check Docker infrastructure
    print(f"{BOLD}[1/4] Checking Docker Infrastructure...{RESET}")
    all_results.append(check_docker_networks())
    all_results.append(check_compose_services())

    # 2. Check critical containers
    print(f"{BOLD}[2/4] Checking Critical Containers...{RESET}")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(check_docker_container, name): name for name in CRITICAL_CONTAINERS}
        for future in as_completed(futures):
            result = future.result()
            all_results.append(result)
            if verbose or not result.passed:
                print(f"  {result}")

    # 3. Check service health endpoints
    print(f"{BOLD}[3/4] Checking Service Health Endpoints...{RESET}")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(check_service_health, service): service for service in SERVICES}
        for future in as_completed(futures):
            result = future.result()
            all_results.append(result)
            if verbose or not result.passed:
                print(f"  {result}")

    # 4. Check critical service dependencies
    print(f"{BOLD}[4/4] Checking Critical Dependencies...{RESET}")

    # Verify VPN is protecting downloads (qBittorrent via Gluetun)
    gluetun_check = check_docker_container('gluetun')
    all_results.append(gluetun_check)
    if verbose or not gluetun_check.passed:
        print(f"  {gluetun_check}")

    # Separate passed and failed results
    passed = [r for r in all_results if r.passed]
    failed = [r for r in all_results if not r.passed]

    return passed, failed


def print_summary(passed: List[TestResult], failed: List[TestResult]):
    """Print test summary"""
    print(f"\n{BOLD}{BLUE}{'='*70}{RESET}")
    print(f"{BOLD}Test Summary{RESET}")
    print(f"{BOLD}{BLUE}{'='*70}{RESET}\n")

    total = len(passed) + len(failed)
    pass_rate = (len(passed) / total * 100) if total > 0 else 0

    print(f"Total Tests: {total}")
    print(f"{GREEN}Passed: {len(passed)}{RESET}")
    print(f"{RED}Failed: {len(failed)}{RESET}")
    print(f"Pass Rate: {pass_rate:.1f}%\n")

    if failed:
        print(f"{BOLD}{RED}Failed Tests:{RESET}")
        for result in failed:
            print(f"  {result}")
        print()

    # Check if critical services failed
    critical_failures = []
    for service in SERVICES:
        if service.get('critical'):
            service_failed = any(f.name == service['name'] and not f.passed for f in failed)
            if service_failed:
                critical_failures.append(service['name'])

    if critical_failures:
        print(f"{BOLD}{RED}CRITICAL: The following critical services are unavailable:{RESET}")
        for name in critical_failures:
            print(f"  - {name}")
        print()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Run OtterStack smoke tests')
    parser.add_argument('-v', '--verbose', action='store_true', help='Show all test results')
    parser.add_argument('--json', action='store_true', help='Output results as JSON')
    args = parser.parse_args()

    start_time = time.time()
    passed, failed = run_smoke_tests(verbose=args.verbose)
    duration = time.time() - start_time

    if args.json:
        # JSON output for CI/CD
        output = {
            'total': len(passed) + len(failed),
            'passed': len(passed),
            'failed': len(failed),
            'duration_seconds': round(duration, 2),
            'results': [
                {'name': r.name, 'passed': r.passed, 'message': r.message, 'duration_ms': r.duration_ms}
                for r in passed + failed
            ]
        }
        print(json.dumps(output, indent=2))
    else:
        # Human-readable output
        print_summary(passed, failed)
        print(f"Completed in {duration:.2f} seconds\n")

    # Exit with error code if any tests failed
    sys.exit(0 if len(failed) == 0 else 1)


if __name__ == '__main__':
    main()
