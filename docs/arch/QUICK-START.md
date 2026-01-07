# Quick Start Guide - Architecture Migration

⚡ **Fast track to understanding and executing the architecture migration**

---

## 📍 You Are Here

Your current setup:
- ✅ 17 services running in Docker
- ❌ Flat network (everything on media-network)
- ❌ 15+ ports exposed directly
- ❌ No centralized authentication
- ❌ HTTP only (no TLS)

---

## 🎯 Where You're Going

After migration:
- ✅ 6 segmented networks (security zones)
- ✅ 3 ports exposed (80, 443, 6881) - **87% reduction**
- ✅ Centralized SSO with 2FA
- ✅ HTTPS everywhere with auto-renewal
- ✅ Encrypted secrets
- ✅ Full observability (metrics + logs)
- ✅ Automated backups + auto-healing

---

## 🚀 Get Started in 3 Steps

### Step 1: Understand (30 minutes)

Read these in order:

1. **Current State**: [network-architecture.md](../network-architecture.md)
   - 7 focused diagrams showing your current setup
   - Identify design issues

2. **Future State**: [proposed-architecture.md](proposed-architecture.md)
   - Clean architecture with separation of concerns
   - Security improvements
   - Why each change matters

3. **Migration Plan**: [implementation/00-migration-summary.md](implementation/00-migration-summary.md)
   - 7 iterations over 6-8 weeks
   - Timeline and risk assessment
   - Success criteria

### Step 2: Prepare (1 hour)

```bash
cd /home/otterammo/media

# 1. Full backup
tar czf ~/media-backup-$(date +%Y%m%d).tar.gz .

# 2. Document current state
docker-compose ps > docs/current-state.txt
docker network ls >> docs/current-state.txt
ss -tlnp | grep LISTEN >> docs/current-state.txt

# 3. Test current setup
curl -I http://jellyfin.lan
curl -I http://sonarr.lan
# ... test all your services

# 4. Create working branch (if using git)
git checkout -b architecture-migration
```

### Step 3: Execute (6-8 weeks)

Follow the iterations in sequence:

```bash
# Week 1-2: Foundation
docs/arch/implementation/iteration-01-network-foundation.md
docs/arch/implementation/iteration-02-port-consolidation.md

# Week 3-4: Security
docs/arch/implementation/iteration-03-tls-https.md
docs/arch/implementation/iteration-04-authentication.md

# Week 5-6: Operations
docs/arch/implementation/iteration-05-secrets-management.md
docs/arch/implementation/iteration-06-enhanced-monitoring.md

# Week 7-8: Hardening
docs/arch/implementation/iteration-07-infrastructure-hardening.md
```

---

## ⏱️ Time Commitment

| Phase | Duration | Your Time | Downtime |
|-------|----------|-----------|----------|
| Planning & Prep | 1 day | 2-3 hours | None |
| Iteration 1 | 1-2 days | 3-4 hours | None |
| Iteration 2 | 2-3 days | 4-5 hours | <5 min/service |
| Iteration 3 | 1-2 days | 2-3 hours | None |
| Iteration 4 | 3-4 days | 5-6 hours | <5 min |
| Iteration 5 | 2-3 days | 3-4 hours | Per-service restart |
| Iteration 6 | 2-3 days | 3-4 hours | None |
| Iteration 7 | 2-3 days | 3-4 hours | None |
| **Total** | **6-8 weeks** | **25-35 hours** | **<30 min total** |

*Note: Duration is calendar time (includes testing/validation). Your active time is much less.*

---

## 🎯 Quick Decision Guide

### Do I need to do all iterations?

**Required (Security critical):**
- ✅ Iteration 1 (Networks) - Foundation for everything
- ✅ Iteration 2 (Ports) - Massive security improvement
- ✅ Iteration 3 (TLS) - Encryption is mandatory
- ✅ Iteration 4 (Auth) - Access control

**Highly Recommended:**
- ⭐ Iteration 5 (Secrets) - Protects credentials
- ⭐ Iteration 6 (Monitoring) - Operational visibility
- ⭐ Iteration 7 (Hardening) - Backups + resilience

### Can I skip iterations?

**No:**
- Iterations 1-2 are sequential (must do in order)
- Iteration 3 requires Iteration 2
- Iteration 4 requires Iteration 3

**Yes (but not recommended):**
- Iteration 6 can be done anytime after Iteration 1
- Iteration 5 can be delayed (but do it eventually)

### What if I only have a weekend?

**Minimal viable migration (2 days):**
1. ✅ Iteration 1: Networks (Saturday morning)
2. ✅ Iteration 2: Ports (Saturday afternoon + evening)
3. ✅ Iteration 3: TLS (Sunday morning)

This gets you 87% attack surface reduction and HTTPS everywhere.

**Complete the rest later:**
- Week 1: Iteration 4 (Auth)
- Week 2: Iteration 5 (Secrets)
- Week 3: Iterations 6-7

---

## 🆘 Emergency Quick Ref

### If something breaks:

```bash
# 1. Check what's wrong
docker-compose ps
docker-compose logs <service>

# 2. Quick fix attempts
docker-compose restart <service>
docker-compose up -d <service>

# 3. Rollback (if needed)
cd /home/otterammo/media
docker-compose down
cp -r backups/iterX-pre/* .
docker-compose up -d

# 4. Verify
docker-compose ps
curl -I http://jellyfin.lan
```

### Iteration-specific rollback:

Each iteration doc has a "Rollback Procedure" section at the bottom.

### Nuclear option (restore everything):

```bash
cd ~
tar xzf media-backup-YYYYMMDD.tar.gz -C /home/otterammo/media/
cd /home/otterammo/media
docker-compose up -d
```

---

## 📋 Pre-flight Checklist

Before starting **Iteration 1**, ensure:

- [ ] ✅ Full backup completed
- [ ] ✅ All services currently working
- [ ] ✅ You have console/SSH access (not just web)
- [ ] ✅ You understand rollback procedures
- [ ] ✅ You have 2-3 hours available
- [ ] ✅ Users notified (if applicable)
- [ ] ✅ Read the iteration 1 document completely

---

## 🎓 Key Concepts (5-minute primer)

### Docker Networks
Think of them like VLANs for containers. Services on same network can talk to each other.

**Current:** All services on one network (flat, insecure)
**Future:** Services on appropriate networks (segmented, secure)

### Traefik (Reverse Proxy)
Acts as a gateway. Instead of exposing each service on its own port, Traefik routes based on hostname.

**Current:** jellyfin on port 8096, sonarr on 8989, etc.
**Future:** All via Traefik on port 80/443 (jellyfin.lan, sonarr.lan)

### Authelia (SSO)
Single sign-on service. Login once, access all protected services.

**Current:** Each service has its own login (or none)
**Future:** One login for all services, with 2FA for admin tools

### Docker Secrets
Secure way to store sensitive data (passwords, API keys).

**Current:** Plaintext in .env file
**Future:** Encrypted in secrets/ directory

---

## 📊 Visual Progress Tracker

Mark your progress as you complete each iteration:

```
[START] → [ ] Iteration 1 → [ ] Iteration 2 → [ ] Iteration 3 → [ ] Iteration 4 → [ ] Iteration 5 → [ ] Iteration 6 → [ ] Iteration 7 → [DONE]
          Networks        Ports           TLS             Auth            Secrets         Monitoring      Hardening
```

---

## 🏆 Success Indicators

After each iteration, you should see:

**Iteration 1:**
- `docker network ls` shows 6 new networks
- All services still accessible
- No errors in logs

**Iteration 2:**
- `ss -tlnp | grep LISTEN` shows only 3 ports: 80, 443, 6881
- All services accessible via Traefik (*.lan domains)

**Iteration 3:**
- Browser shows 🔒 (secure) for all services
- HTTP redirects to HTTPS

**Iteration 4:**
- Login page appears when accessing protected services
- 2FA required for admin services

**Iteration 5:**
- `cat .env` shows no sensitive data
- Services still work (now using secrets)

**Iteration 6:**
- Grafana shows logs from all services
- Unified dashboards with metrics + logs

**Iteration 7:**
- `/mnt/backups/` contains automated backups
- `docker stats` shows resource limits enforced

---

## 💡 Pro Tips

1. **Do it on a weekday evening** (not Friday night)
   - If something breaks, you have the next day to fix it

2. **Test between iterations**
   - Don't rush through
   - Validate thoroughly before moving on

3. **Keep notes**
   - Document what you changed
   - Note any deviations from the guide
   - Capture error messages

4. **Use tmux/screen**
   - Keep logs visible: `docker-compose logs -f`
   - Have multiple sessions open

5. **Take snapshots**
   - Before each iteration
   - After successful validation
   - Named clearly: `backup-iter2-complete`

---

## 📞 Need Help?

### Before asking for help:

1. ✅ Check the iteration's "Troubleshooting" section
2. ✅ Review `docker-compose logs <service>`
3. ✅ Verify service networks: `docker inspect <service> | grep -A 10 Networks`
4. ✅ Test with curl: `curl -v http://service.lan`

### When asking for help, include:

- Which iteration you're on
- What step you're at
- Error messages (exact text)
- Output of `docker-compose ps`
- Relevant logs

---

## 🎯 Your Next Steps

1. **Right now (5 min):**
   - [ ] Read this entire document
   - [ ] Bookmark key files
   - [ ] Check disk space: `df -h`

2. **Within 24 hours (30 min):**
   - [ ] Read [00-migration-summary.md](implementation/00-migration-summary.md)
   - [ ] Review [proposed-architecture.md](proposed-architecture.md)
   - [ ] Create backup: `tar czf ~/media-backup.tar.gz /home/otterammo/media`

3. **Within 1 week (2-3 hours):**
   - [ ] Complete Iteration 1
   - [ ] Validate everything still works
   - [ ] Plan time for Iteration 2

4. **Within 8 weeks:**
   - [ ] Complete all 7 iterations
   - [ ] Celebrate! 🎉

---

## 📚 Documentation Map

```
docs/arch/
├── README.md                          ← Start here (overview)
├── QUICK-START.md                     ← You are here (fast track)
├── network-architecture.md            ← Current architecture (visual)
├── proposed-architecture.md           ← Target architecture (detailed)
└── implementation/
    ├── 00-migration-summary.md        ← Migration overview
    ├── iteration-01-network-foundation.md
    ├── iteration-02-port-consolidation.md
    ├── iteration-03-tls-https.md
    ├── iteration-04-authentication.md
    ├── iteration-05-secrets-management.md
    ├── iteration-06-enhanced-monitoring.md
    └── iteration-07-infrastructure-hardening.md
```

---

## ✅ Final Checklist

Ready to start? Check all boxes:

- [ ] I have read this quick start guide
- [ ] I understand the current architecture
- [ ] I understand the target architecture
- [ ] I have a full backup
- [ ] I have 2-3 hours available for Iteration 1
- [ ] I know how to rollback if needed
- [ ] I have read the Iteration 1 document

**All checked?** → [Start Iteration 1](implementation/iteration-01-network-foundation.md)

---

**Good luck! You've got this.** 💪

---

*Questions? Check the main [README.md](README.md) for more detailed information.*
