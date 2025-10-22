# VPN Setup Guide

This guide walks you through setting up Gluetun VPN with Mullvad WireGuard to protect your qBittorrent traffic.

## Overview

After completing this setup:
- All qBittorrent torrent traffic will route through Mullvad VPN
- Your real IP address will be hidden from torrent peers
- Automatic killswitch prevents IP leaks if VPN disconnects
- Other services (Jellyfin, Sonarr, Radarr) remain on direct connection for better performance

## Prerequisites

- Active Mullvad VPN account (sign up at https://mullvad.net/)
- Docker and Docker Compose installed
- Media stack already set up

## Step 1: Get Mullvad WireGuard Credentials

1. Sign up for Mullvad VPN if you haven't already: https://mullvad.net/
2. Log into your Mullvad account
3. Navigate to WireGuard configuration: https://mullvad.net/en/account/wireguard-config
4. Click "Generate key" to create a new WireGuard key pair
5. You'll see output similar to:
   ```
   [Interface]
   PrivateKey = abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx=
   Address = 10.67.123.45/32
   DNS = 10.64.0.1
   ```
6. Copy the `PrivateKey` and `Address` values

## Step 2: (Optional) Request Port Forwarding

Port forwarding improves seeding performance by allowing incoming connections:

1. In your Mullvad account, go to Port Forwarding
2. Request a port (you'll receive a random port number, e.g., 51820)
3. Note this port number for configuration

## Step 3: Configure Environment Variables

1. Open your `.env` file (or create it from `.env.template`):
   ```bash
   cd /home/otterammo/media
   cp .env.template .env
   nano .env
   ```

2. Add/update these VPN-related variables:
   ```bash
   # VPN Configuration
   VPN_PROVIDER=mullvad
   VPN_TYPE=wireguard
   
   # Paste your credentials from Step 1
   WIREGUARD_PRIVATE_KEY='abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx='
   WIREGUARD_ADDRESSES=10.67.123.45/32
   
   # Choose a server city close to you
   VPN_SERVER_CITIES=Chicago
   
   # If you requested port forwarding in Step 2, use that port
   # Otherwise, leave as 6881
   VPN_INPUT_PORTS=6881
   
   # Update these subnets if your network differs
   FIREWALL_OUTBOUND_SUBNETS=172.18.0.0/16,192.168.1.0/24
   ```

3. Save and close the file

## Step 4: Verify Docker Network Subnet

The `FIREWALL_OUTBOUND_SUBNETS` must include your Docker network subnet:

```bash
docker network inspect media-network | grep Subnet
```

You should see something like:
```
"Subnet": "172.18.0.0/16"
```

If the subnet is different, update `FIREWALL_OUTBOUND_SUBNETS` in your `.env` file.

## Step 5: Start Gluetun and qBittorrent

Start both containers together (they're now in the same compose file):

```bash
cd /home/otterammo/media/qbittorrent
docker compose up -d
```

This will:
1. Pull the Gluetun image (first time only)
2. Start Gluetun VPN container
3. Establish WireGuard tunnel to Mullvad
4. Start qBittorrent with network routed through Gluetun

## Step 6: Verify VPN Connection

### Check VPN is Connected

```bash
docker logs gluetun
```

Look for messages like:
```
INFO [vpn] You are running on the bleeding edge of latest!
INFO [ip getter] Public IP address is x.x.x.x (Mullvad)
INFO [vpn] Connected!
```

### Verify IP Address

Check what IP address qBittorrent sees:

```bash
docker exec gluetun wget -qO- https://api.ipify.org
```

This should return a Mullvad IP address (NOT your home IP).

### Check DNS

```bash
docker exec gluetun cat /etc/resolv.conf
```

Should show Mullvad DNS servers (typically 10.64.0.1).

### Test qBittorrent Access

Visit your qBittorrent WebUI:
```
http://localhost:8080
```

or via Traefik domain:
```
http://qbittorrent.local
```

## Step 7: Configure qBittorrent Settings

1. Log into qBittorrent WebUI
2. Go to Settings → Connection

### Connection Settings:
- **Listening Port**: Set to `6881` (or your port forwarding port)
- **Use UPnP / NAT-PMP**: Disable (not needed with port forwarding)
- **Network Interface**: Leave as default

### Optional - Check Connection Status:
You can verify port forwarding is working by checking the connection icon in qBittorrent. A green icon indicates incoming connections are working.

## Step 8: Update Sonarr/Radarr Configuration

Your Sonarr/Radarr services need to point to the new qBittorrent host:

1. Open Sonarr/Radarr WebUI
2. Go to Settings → Download Clients
3. Edit your qBittorrent download client
4. Change host from `qbittorrent` to `gluetun`
5. Keep port as `8080`
6. Test and save

## Verification Checklist

- [ ] Gluetun container is running: `docker ps | grep gluetun`
- [ ] VPN shows "Connected" in logs: `docker logs gluetun | grep Connected`
- [ ] External IP shows Mullvad: `docker exec gluetun wget -qO- https://api.ipify.org`
- [ ] qBittorrent WebUI is accessible
- [ ] Sonarr/Radarr can communicate with qBittorrent
- [ ] Test torrent download works

## Troubleshooting

### Gluetun Won't Start

Check logs:
```bash
docker logs gluetun
```

Common issues:
- Invalid WireGuard credentials
- Expired Mullvad account
- Port conflict on 8080 or 6881

### qBittorrent Not Accessible

1. Check Gluetun is running:
   ```bash
   docker ps | grep gluetun
   ```

2. Verify VPN is connected:
   ```bash
   docker logs gluetun | tail -20
   ```

3. Check qBittorrent is running:
   ```bash
   docker ps | grep qbittorrent
   ```

### Sonarr/Radarr Can't Reach qBittorrent

1. Update download client host to `gluetun` (not `qbittorrent`)

2. Verify Docker network subnet is correct:
   ```bash
   docker network inspect media-network | grep Subnet
   ```

3. Update `FIREWALL_OUTBOUND_SUBNETS` in `.env` if needed

4. Restart Gluetun:
   ```bash
   docker compose restart gluetun
   ```

### IP Leak Test

To verify no leaks:

```bash
# Should show Mullvad IP
docker exec gluetun wget -qO- https://api.ipify.org

# Should show Mullvad DNS
docker exec gluetun cat /etc/resolv.conf

# Check firewall rules
docker exec gluetun iptables -L OUTPUT -v -n
```

### Container Restart Issues

If Gluetun or qBittorrent keeps restarting:

1. Check resource limits:
   ```bash
   docker stats
   ```

2. Review logs for errors:
   ```bash
   docker logs gluetun
   docker logs qbittorrent
   ```

3. Verify environment variables are set correctly:
   ```bash
   docker exec gluetun env | grep -E "VPN|WIREGUARD"
   ```

## Rolling Back

If you need to revert to direct connection:

1. Stop containers:
   ```bash
   cd /home/otterammo/media/qbittorrent
   docker compose down
   ```

2. Remove Gluetun service from `docker compose.yml`

3. Restore original qBittorrent configuration:
   - Remove `network_mode: "service:gluetun"`
   - Remove `depends_on: gluetun`
   - Add back ports and networks to qBittorrent
   - Move Traefik labels back to qBittorrent

4. Restart:
   ```bash
   docker compose up -d
   ```

## Next Steps

- Monitor VPN uptime and performance
- Configure port forwarding in Mullvad for better seeding
- Set up monitoring alerts for VPN disconnections
- Review [VPN-ARCHITECTURE.md](./docs/VPN-ARCHITECTURE.md) for detailed architecture

## Additional Resources

- [Gluetun Documentation](https://github.com/qdm12/gluetun-wiki)
- [Mullvad VPN](https://mullvad.net/)
- [Mullvad WireGuard Setup](https://mullvad.net/en/help/wireguard-and-mullvad-vpn/)
- [VPN Architecture Document](./docs/VPN-ARCHITECTURE.md)

## Security Notes

- Never commit your `.env` file with real credentials
- Regularly verify VPN connection status
- Monitor for IP leaks periodically
- Keep Gluetun image updated for security patches
- Consider enabling Mullvad's "Always on VPN" in account settings
