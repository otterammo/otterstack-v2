# Media Stack

A Docker-based media management solution with automated deployment and management tools.

## Quick Start

1. **Configure Environment**
   ```bash
   cp .env.template .env
   # Edit .env with your settings
   ```

2. **Make the script executable**
   ```bash
   chmod +x media-stack.sh
   ```

3. **Start the stack**
   ```bash
   ./media-stack.sh start
   ```

## Usage

```bash
./media-stack.sh {start|stop|restart|status|logs}
```

### Commands

- `start` - Start all services
- `stop` - Stop all services
- `restart` - Restart all services
- `status` - Show status of all services
- `logs [service]` - View logs (optionally for a specific service)

## Remote Access with Cloudflare Tunnel

This stack includes Cloudflare Tunnel (cloudflared) for secure remote access without opening ports on your router.

### Setup Cloudflare Tunnel

1. **Create a tunnel** in the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. **Configure your tunnel token** in the `.env` file:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here
   ```
3. **Set up tunnel routes** in the Cloudflare dashboard for your services
4. **Start the cloudflared service**:
   ```bash
   docker compose up -d cloudflared
   ```

For detailed setup instructions, see `cloudflared/README.md`.
