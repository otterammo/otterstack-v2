# Fail2ban Details

Automatically bans malicious IPs by monitoring Traefik access logs.

## Protection Rules

### traefik-auth
- Trigger: 5 failed auth attempts (401/403) in 10 minutes
- Ban: 1 hour

### traefik-botsearch
- Trigger: 3 bot/scanner requests (.php, wp-admin, etc.) in 10 minutes
- Ban: 24 hours

## Common Commands

### Check Status
```bash
# View all jails
docker exec fail2ban fail2ban-client status

# View banned IPs
docker exec fail2ban fail2ban-client status traefik-auth
docker exec fail2ban fail2ban-client status traefik-botsearch
```

### Manage Bans
```bash
# Unban an IP
docker exec fail2ban fail2ban-client set traefik-auth unbanip <IP>

# Unban all
docker exec fail2ban fail2ban-client unban --all
```

### View Logs
```bash
# Live logs
docker compose logs -f fail2ban

# Last 50 lines
docker compose logs --tail 50 fail2ban
```

## Configuration

### Adjust Ban Rules
Edit `fail2ban/config/jail.d/traefik.conf`:
```ini
[traefik-auth]
maxretry = 5    # Attempts before ban
bantime = 1h    # Ban duration (1h, 24h, 7d, etc.)
findtime = 10m  # Time window for counting attempts
```

### Whitelist IPs
Create `fail2ban/config/jail.d/00-whitelist.conf`:
```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24 your-trusted-ip
```

### Email Notifications (Optional)
Add to `.env`:
```bash
FAIL2BAN_EMAIL=your-email@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
```

Update `fail2ban/docker-compose.yml`:
```yaml
- F2B_ACTION=%(action_mw)s  # Sends email with whois
```

Restart:
```bash
docker compose restart fail2ban
```

## Troubleshooting

### No IPs being banned
1. Check Traefik logs exist:
   ```bash
   ls -la traefik/logs/access.log
   ```
2. Verify Fail2ban can read logs:
   ```bash
   docker exec fail2ban ls -la /traefik-logs/
   ```
3. Test filter manually:
   ```bash
   docker exec fail2ban fail2ban-regex /traefik-logs/access.log /data/filter.d/traefik-auth.conf
   ```
4. Check iptables rules:
   ```bash
   sudo iptables -L f2b-traefik-auth -v -n
   ```

### Reload Configuration
```bash
# Reload all jails
docker exec fail2ban fail2ban-client reload

# Reload specific jail
docker exec fail2ban fail2ban-client reload traefik-auth
```
