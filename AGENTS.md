# AGENTS.md

Guidance for coding agents working in this repository.

## Scope and priorities

- This repo is a modular Docker Compose media stack ("OtterStack").
- Prefer minimal, targeted changes that preserve running service behavior.
- Optimize for operational safety first: do not break networking, secrets, or VPN isolation.

## Repository map

- Root orchestrator: `docker-compose.yml` (uses `include:` for service stacks)
- Service compose files:
  - `backup/docker-compose.yml`
  - `cloudflared/docker-compose.yml`
  - `dozzle/docker-compose.yml`
  - `fail2ban/docker-compose.yml`
  - `jellyfin/docker-compose.yml`
  - `jellyseerr/docker-compose.yml`
  - `monitoring/docker-compose.yml`
  - `qbittorrent/docker-compose.yml`
  - `servarr/docker-compose.yml`
  - `traefik/docker-compose.yml`
  - `web-ui/docker-compose.yml`
- Network definitions: `networks.yml`
- Main control scripts:
  - `media-stack.sh`
  - `test-stack.sh`
  - `scripts/validate-config.sh`
- Smoke tests: `tests/smoke_test.py`
- Environment template: `.env.example`
- Secrets reference: `secrets/README.md`

## Core workflow

1. Read relevant compose/service files before editing.
2. Keep edits localized to the service being changed.
3. Validate compose syntax and affected behavior.
4. Run smoke tests when changes can impact runtime behavior.
5. Summarize what changed, why, and how you validated it.

## Commands agents should use

- Stack lifecycle:
  - `./media-stack.sh start`
  - `./media-stack.sh stop`
  - `./media-stack.sh restart`
  - `./media-stack.sh status`
  - `./media-stack.sh logs [service]`
- Validation:
  - `docker compose config --quiet`
  - `./scripts/validate-config.sh`
  - `./test-stack.sh`
  - `./test-stack.sh -v`
  - `./test-stack.sh --wait`
- Web UI (Next.js app in `web-ui/`):
  - `npm run dev`
  - `npm run build`
  - `npm run lint`

## Compose and network conventions

- Root `docker-compose.yml` is the source of truth for included stacks and shared secrets.
- Keep network segmentation consistent with `networks.yml`:
  - `dmz-net`, `frontend-net`, `backend-net`, `download-net`, `mgmt-net`, `security-net`
- Externally routed services should use Traefik labels and the correct `traefik.docker.network`.
- Internal/admin routes generally use `TAILSCALE_HOST`.
- Public routes use `PUBLIC_*_DOMAIN` variables when applicable.

## Critical invariants (do not break)

- qBittorrent must remain behind Gluetun VPN (`qbittorrent` uses `network_mode: service:gluetun`).
- Required secrets must stay wired through root compose:
  - `cloudflare_token`
  - `grafana_admin_password`
  - `webui_admin_password`
  - `wireguard_private_key`
- Health checks should remain present for core services and use native endpoints where possible.
- Smoke-test critical containers/services in `tests/smoke_test.py` should stay aligned with compose changes.

## When adding or changing a service

1. Update/create `<service>/docker-compose.yml`.
2. Add/remove include entry in root `docker-compose.yml`.
3. Attach appropriate networks from `networks.yml`.
4. Add/update Traefik labels if the service is externally reachable.
5. Add/update healthchecks.
6. Update `tests/smoke_test.py` if service health expectations changed.
7. Update service README/docs when behavior or setup changes.

## Security rules

- Never commit secret values from `secrets/` or `.env`.
- Do not print secret contents in logs or summaries.
- Preserve restrictive permissions expectations (`secrets/` 700, files 600).

## Editing and review guidelines

- Prefer small diffs and avoid broad refactors unrelated to the task.
- Preserve existing naming and compose style unless there is a clear reason to change it.
- Do not silently change ports, hostnames, mount paths, or networks without documenting impact.
- If runtime validation cannot be executed, state that explicitly and explain why.
