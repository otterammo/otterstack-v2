# Authelia

Single sign-on and 2FA gateway for the stack, integrated with Traefik forward-auth.

## Services
- `authelia` - auth portal and forward-auth endpoint
- `authelia-redis` - session storage

## Access
- Auth portal: `https://<TAILSCALE_HOST>:9091` (Traefik entrypoint `authelia`)
- Forward-auth middleware: `authelia@docker`

## Configuration
- Main config: `authelia/config/configuration.yml`
- Users: `authelia/config/users.yml`
- Secrets directory: `authelia/data/secrets`
  - `jwt_secret`
  - `session_secret`
  - `storage_encryption_key`

## Data
- Database: `authelia/data/db.sqlite3`
- Notifications log: `authelia/data/notifications.txt`
- Authelia logs: `authelia/data/authelia.log`

## Required edits
- Update domains in `authelia/config/configuration.yml` to match `TAILSCALE_HOST`.
- Generate user password hashes:
  ```bash
  docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password 'YourPassword'
  ```

## Environment
- `TZ` (default `UTC`)
- `TAILSCALE_HOST` (used by Traefik labels and Authelia config)

## Start/stop
```bash
docker compose up -d
docker compose logs -f authelia
```
