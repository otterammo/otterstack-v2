# Fail2ban

Intrusion prevention that bans malicious IPs based on Traefik access logs.

See `DETAILS.md` for rules, tuning, and alerting setup.

## Access
- No UI; manage via `fail2ban-client` in the container.

## Configuration
- Jails: `fail2ban/config/jail.d/traefik.conf`
- Filters: `fail2ban/config/filter.d/`
- Database: `fail2ban/config/db/fail2ban.sqlite3`
- Traefik logs mounted at `/traefik-logs`
- Default rules:
  - `traefik-auth`: 5 failed 401/403 attempts in 10m, ban 1h
  - `traefik-botsearch`: 3 bot/scanner requests in 10m, ban 24h
- Whitelist example: `fail2ban/config/jail.d/00-whitelist.conf`

## Environment
- `TZ`
- `F2B_LOG_LEVEL`, `F2B_DB_PURGE_AGE`, `F2B_MAX_RETRY`
- Email alerts: `FAIL2BAN_EMAIL`, `FAIL2BAN_SENDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_TLS`
- Action: `F2B_ACTION` (set to `%(action_mw)s` to enable email with whois)

## Start/stop
```bash
docker compose up -d
docker compose logs -f fail2ban
```

## Troubleshooting
- Status: `docker exec fail2ban fail2ban-client status`
- Banned IPs: `docker exec fail2ban fail2ban-client status traefik-auth`
- Unban an IP: `docker exec fail2ban fail2ban-client set traefik-auth unbanip <IP>`
- Verify Traefik logs exist: `ls -la traefik/logs/access.log`
- Check Fail2ban can read logs: `docker exec fail2ban ls -la /traefik-logs/`
- Test filters manually:
  ```bash
  docker exec fail2ban fail2ban-regex /traefik-logs/access.log /data/filter.d/traefik-auth.conf
  ```
- Check iptables rules: `sudo iptables -L f2b-traefik-auth -v -n`
- Reload jails: `docker exec fail2ban fail2ban-client reload`

## Security
- Runs in host network mode to manage iptables.
- Review whitelists to avoid banning trusted IPs.
