# qBittorrent (Gluetun VPN)

Torrent client routed through a Gluetun WireGuard tunnel.

## Services
- `gluetun` - VPN gateway (WireGuard)
- `qbittorrent` - torrent client (shares Gluetun network)

## Access
- Web UI: `https://<TAILSCALE_HOST>:8080` (Traefik entrypoint `qbittorrent`, Authelia protected)
- Torrent ports: `6881/tcp` and `6881/udp` exposed from `gluetun`

## Configuration
- qBittorrent config: `qbittorrent/qbittorrent/config`
- Gluetun state: `qbittorrent/gluetun`
- Downloads: `DOWNLOADS_PATH` (default `/mnt/external/downloads`)

## Required secrets and env
- Secret: `secrets/wireguard_private_key` (Mullvad WireGuard PrivateKey)
- Required env: `WIREGUARD_ADDRESSES`
- VPN settings: `VPN_PROVIDER`, `VPN_SERVER_CITIES`, `VPN_TYPE`
- Firewall settings: `FIREWALL_INPUT_PORTS`, `FIREWALL_VPN_INPUT_PORTS`, `FIREWALL_OUTBOUND_SUBNETS`

## Notes
- qBittorrent has no direct ports; all ingress goes through Gluetun and Traefik.

## Start/stop
```bash
docker compose up -d
docker compose logs -f gluetun
```
