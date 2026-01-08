# TLS Certificate Rotation Guide

This document describes how to rotate the self-signed certificates used for local `.lan` domain HTTPS access.

## Certificate Location

```
/home/otterammo/media/traefik/config/certs/
├── local-cert.pem    # Certificate (public)
├── local-key.pem     # Private key (keep secure)
└── san.cnf           # OpenSSL configuration
```

## Current Certificate Details

- **Type**: Self-signed CA certificate
- **Validity**: 365 days
- **Domains**: `*.lan` wildcard + explicit SANs for each service
- **Key Size**: 2048-bit RSA

## When to Rotate

- Certificate expires (check with command below)
- Adding new services that need explicit SANs
- Security incident requiring key rotation
- Annual rotation as best practice

## Check Certificate Expiration

```bash
openssl x509 -in /home/otterammo/media/traefik/config/certs/local-cert.pem -noout -dates
```

## Rotation Procedure

### Step 1: Generate New Certificate

```bash
cd /home/otterammo/media/traefik/config/certs

# Generate new private key
openssl genrsa -out local-key.pem 2048

# Generate new certificate using existing config
openssl req -new -x509 -sha256 \
  -key local-key.pem \
  -out local-cert.pem \
  -days 365 \
  -config san.cnf \
  -extensions v3_req

# Set permissions
chmod 600 local-key.pem
chmod 644 local-cert.pem
```

### Step 2: Verify New Certificate

```bash
# Check certificate details
openssl x509 -in local-cert.pem -noout -text | grep -E "(Subject:|CA:|DNS:|Not)"

# Verify SANs are present
openssl x509 -in local-cert.pem -noout -text | grep -A 1 "Subject Alternative Name"
```

### Step 3: Reload Traefik

```bash
# Traefik watches the config directory, but restart ensures clean reload
docker restart traefik

# Verify Traefik is healthy
docker ps --filter name=traefik
```

### Step 4: Test HTTPS Access

```bash
# Test from server
curl -k -s -o /dev/null -w "%{http_code}" --resolve jellyfin.lan:443:127.0.0.1 https://jellyfin.lan

# Check certificate being served
echo | openssl s_client -connect 127.0.0.1:443 -servername jellyfin.lan 2>/dev/null | openssl x509 -noout -dates
```

### Step 5: Update Client Machines

The new certificate must be trusted on all client machines.

#### macOS

```bash
# Copy certificate from server
scp otterammo@192.168.86.111:/home/otterammo/media/traefik/config/certs/local-cert.pem ~/media-server-ca.crt

# Remove old certificate
sudo security delete-certificate -c "Media Server Local CA" /Library/Keychains/System.keychain 2>/dev/null

# Add new certificate
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/media-server-ca.crt

# Restart browsers
```

#### Linux (Debian/Ubuntu)

```bash
# Copy certificate from server
scp otterammo@192.168.86.111:/home/otterammo/media/traefik/config/certs/local-cert.pem ~/media-server-ca.crt

# Install to system trust store
sudo cp ~/media-server-ca.crt /usr/local/share/ca-certificates/media-server.crt
sudo update-ca-certificates

# Restart browsers
```

#### Linux (Fedora/RHEL)

```bash
# Copy certificate from server
scp otterammo@192.168.86.111:/home/otterammo/media/traefik/config/certs/local-cert.pem ~/media-server-ca.crt

# Install to system trust store
sudo cp ~/media-server-ca.crt /etc/pki/ca-trust/source/anchors/media-server.crt
sudo update-ca-trust

# Restart browsers
```

#### Windows

1. Copy `local-cert.pem` to Windows machine and rename to `media-server.crt`
2. Double-click the file
3. Click "Install Certificate"
4. Select "Local Machine" → Next
5. Select "Place all certificates in the following store"
6. Browse → "Trusted Root Certification Authorities" → OK
7. Next → Finish
8. Restart browsers

#### Firefox (all platforms)

Firefox uses its own certificate store:
1. Settings → Privacy & Security → Certificates → View Certificates
2. Authorities tab → Import
3. Select the certificate file
4. Check "Trust this CA to identify websites"
5. OK

## Adding New Services

If you add a new service that needs HTTPS, update the SAN configuration:

### Step 1: Edit san.cnf

```bash
nano /home/otterammo/media/traefik/config/certs/san.cnf
```

Add new DNS entry under `[alt_names]`:
```
DNS.17 = newservice.lan
```

### Step 2: Regenerate Certificate

Follow the rotation procedure above (Steps 1-5).

## Current SAN Configuration

The certificate includes these domains:

| DNS Entry | Service |
|-----------|---------|
| *.lan | Wildcard (fallback) |
| jellyfin.lan | Jellyfin |
| jellyseerr.lan | Jellyseerr |
| sonarr.lan | Sonarr |
| radarr.lan | Radarr |
| prowlarr.lan | Prowlarr |
| bazarr.lan | Bazarr |
| qbittorrent.lan | qBittorrent |
| grafana.lan | Grafana |
| prometheus.lan | Prometheus |
| alertmanager.lan | Alertmanager |
| cadvisor.lan | cAdvisor |
| dozzle.lan | Dozzle |
| traefik.lan | Traefik Dashboard |
| dashboard.lan | Web UI Dashboard |
| localhost | Local testing |

## Troubleshooting

### Certificate not updating in browser

- Clear browser cache and cookies
- Try incognito/private window
- Restart browser completely (Cmd+Q / Alt+F4)
- Check system date/time is correct

### Safari still shows "not private"

Safari is strict about self-signed certificates:
1. Ensure certificate has `CA:TRUE` basic constraint
2. Ensure certificate is in System keychain (not login)
3. Ensure trust is set to "Always Trust"
4. Try: `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain`

### Traefik not serving new certificate

```bash
# Check Traefik can read the certificate
docker exec traefik cat /config/certs/local-cert.pem | head -5

# Check for TLS errors in logs
docker logs traefik 2>&1 | grep -i tls

# Force restart
docker restart traefik
```

### Certificate expired

Check expiration:
```bash
openssl x509 -in /home/otterammo/media/traefik/config/certs/local-cert.pem -noout -enddate
```

If expired, follow the full rotation procedure above.

## Automation (Optional)

To automate certificate rotation, create a cron job:

```bash
# Edit crontab
crontab -e

# Add entry to rotate annually (January 1st at 3am)
0 3 1 1 * /home/otterammo/media/scripts/rotate-certs.sh
```

Example rotation script (`/home/otterammo/media/scripts/rotate-certs.sh`):
```bash
#!/bin/bash
cd /home/otterammo/media/traefik/config/certs
openssl genrsa -out local-key.pem 2048
openssl req -new -x509 -sha256 -key local-key.pem -out local-cert.pem -days 365 -config san.cnf -extensions v3_req
chmod 600 local-key.pem
chmod 644 local-cert.pem
docker restart traefik
echo "Certificate rotated on $(date)" >> /var/log/cert-rotation.log
```

**Note**: Clients will still need to manually update their trusted certificates after rotation.
