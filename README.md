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

