# Alertmanager Configuration

This directory contains the Alertmanager configuration for sending Discord notifications when Prometheus alerts are triggered.

## Discord Webhook Setup

### 1. Create a Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook** or **Create Webhook**
4. Configure the webhook:
   - **Name**: Media Stack Alerts (or any name you prefer)
   - **Channel**: Select the channel where you want alerts posted
5. Click **Copy Webhook URL**
6. Save the changes

### 2. Configure Alertmanager

1. Open `alertmanager/config/alertmanager.yml`
2. Replace `YOUR_DISCORD_WEBHOOK_URL_HERE` with your actual Discord webhook URL (in all 3 receiver configurations)
3. Save the file

### 3. Restart the Monitoring Stack

```bash
./media-stack.sh restart monitoring
```

## Alert Routing

Alerts are routed based on severity:

- **Critical alerts** (🚨): Sent every 4 hours if still firing
- **Warning alerts** (⚠️): Sent every 12 hours if still firing
- **Default alerts** (📊): Sent every 12 hours if still firing

## Testing Alerts

You can test your alert configuration by:

1. Temporarily lowering an alert threshold in `prometheus/config/alert_rules.yml`
2. Sending a test notification via Alertmanager UI at `https://<TAILSCALE_HOST>:9093`
3. Stopping a critical service to trigger a `ServiceDown` alert

## Alertmanager UI

Access the Alertmanager web interface at:
- `https://<TAILSCALE_HOST>:9093` (Authelia protected)

Features:
- View active alerts
- Silence alerts temporarily
- View silenced alerts
- Check notification status

## Customization

### Change Notification Frequency

Edit the `repeat_interval` values in `alertmanager.yml`:
- Default: `12h` (12 hours)
- Critical: `4h` (4 hours)
- Warning: `12h` (12 hours)

### Customize Messages

The message templates use Go templating. Available fields:
- `{{ .Annotations.summary }}` - Alert summary
- `{{ .Annotations.description }}` - Alert description
- `{{ .Labels.severity }}` - Alert severity level
- `{{ .Status }}` - firing or resolved
- `{{ .Labels.instance }}` - Instance name
- `{{ .Labels.job }}` - Job name

### Multiple Discord Channels

You can send different alerts to different Discord channels:

```yaml
receivers:
  - name: 'discord-critical'
    discord_configs:
      - webhook_url: 'https://discord.com/api/webhooks/CRITICAL_CHANNEL_WEBHOOK'
        
  - name: 'discord-warning'
    discord_configs:
      - webhook_url: 'https://discord.com/api/webhooks/WARNING_CHANNEL_WEBHOOK'
```

## Troubleshooting

### Alerts not sending to Discord

1. Check Alertmanager logs:
   ```bash
   docker logs alertmanager
   ```

2. Verify webhook URL is correct in `alertmanager.yml`

3. Check Prometheus is connected to Alertmanager:
   - Visit `https://<TAILSCALE_HOST>:9090/status`
   - Look for Alertmanager in the "Runtime & Build Information" section

4. Verify alerts are firing:
   - Visit `https://<TAILSCALE_HOST>:9090/alerts`
   - Check alert status

5. Test webhook manually:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"content": "Test message from Media Stack"}' \
     YOUR_DISCORD_WEBHOOK_URL
   ```

### Alerts showing in Prometheus but not in Alertmanager

- Check Prometheus configuration points to correct Alertmanager target
- Restart Prometheus: `./media-stack.sh restart monitoring`

## Configuration Files

- `alertmanager.yml` - Main Alertmanager configuration
- `../prometheus/config/alert_rules.yml` - Alert rules definition
- `../prometheus/config/prometheus.yml` - Prometheus configuration with Alertmanager target
