# PINGO

PINGO is a small monitoring SaaS for websites. Add a URL once and PINGO watches HTTP uptime, SSL certificates, DNS records and domain expiration, then sends short alerts to Telegram.

> Add your website once. We watch everything else.

This repository is a production-ready monorepo: web app, background workers, PostgreSQL, Redis, Stripe billing, Telegram bot, Docker and tests.

**Have a lawyer review `/privacy` and `/terms` before production.** Those pages are templates, not legal advice.

## Architecture

```text
Browser
   ↓
Web App (Next.js)
   ↓
PostgreSQL
   ↕
Redis → Workers (BullMQ)
          ↓
   Target websites
   DNS
   RDAP
   Telegram
```

- `apps/web` — dashboard, landing, REST API, Stripe/Telegram webhooks
- `apps/worker` — scheduler, HTTP/SSL/DNS/RDAP checks, Telegram delivery
- `packages/database` — Prisma schema and client
- `packages/monitoring` — SSRF-safe checks, state machine, RDAP provider
- `packages/core` — monitor/incident/preference services shared by the web API and the bot
- `packages/telegram-bot` — the Telegram bot UI (menus, inline keyboards, EN/RU)
- `packages/notifications` — Telegram delivery and alert templates
- `packages/billing` — Stripe behind a `BillingProvider` interface
- `packages/email` — Resend behind an `EmailProvider` interface
- `packages/shared` — plans, Zod schemas, queues, logging

Monitoring never runs inside a frontend request. “Check now” only enqueues a job.

## Requirements

- Node.js 22
- pnpm 11
- Docker (for PostgreSQL and Redis locally, and for production)

## Local setup

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

Open http://localhost:3000

Seeded accounts:

- `demo@pingo.local` / `Demo1234!`
- `admin@pingo.local` / `Admin1234!` (or `ADMIN_EMAIL`)

`pnpm dev` starts the Next.js app and the worker together.

## Environment variables

See `.env.example`. Important keys:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Redis / BullMQ |
| `APP_URL` | Public URL, used in auth, Stripe redirects, Telegram links |
| `APP_SECRET` | Auth secret, at least 16 characters, 32+ in production |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_BOT_USERNAME` | Used for `t.me` deep links |
| `TELEGRAM_WEBHOOK_SECRET` | Production webhook secret header |
| `STRIPE_TEST_SECRET_KEY` / `STRIPE_TEST_WEBHOOK_SECRET` | Sandbox key set |
| `STRIPE_LIVE_SECRET_KEY` / `STRIPE_LIVE_WEBHOOK_SECRET` | Live key set |
| `STRIPE_DEFAULT_MODE` | `test` or `live` until an admin switches it (default: `test` when configured) |
| `STRIPE_{TEST,LIVE}_PRICE_PERSONAL` / `PRO` / `AGENCY` | Optional price ID overrides (prices are normally found by lookup key) |
| `RESEND_API_KEY` | Transactional email |
| `EMAIL_FROM` | From address |
| `SENTRY_DSN` | Optional error tracking |
| `POSTHOG_API_KEY` | Optional product analytics |
| `MOCK_MONITORING` | `true` to skip live HTTP/SSL/DNS/RDAP in UI development |

If Resend is not configured, emails are logged. If Stripe is not configured, checkout returns a clear error. If Telegram is not configured, the rest of the product still works.

## Database migration

```bash
pnpm db:generate
pnpm db:migrate:deploy   # production / CI
pnpm db:migrate          # development, if you change the schema
pnpm db:seed
```

## How monitoring works

1. A dispatcher job runs every 15 seconds.
2. It claims due monitors with a compare-and-set on `nextCheckAt` and enqueues unique BullMQ jobs.
3. Website checks use DNS resolution + public IP validation before connecting, then HEAD with GET fallback and bounded response bodies.
4. Two consecutive failures open an incident and send a Telegram downtime alert.
5. The next success closes the incident and sends a recovery alert.
6. SSL and domain lookups run daily. DNS snapshots run every 30 minutes.
7. Notification `deduplicationKey` values prevent duplicate alerts.

Check intervals depend on plan: 5 minutes on Free, 1 minute on paid plans.

## Telegram setup

1. Open [@BotFather](https://t.me/BotFather) and create a bot (the product default name is `PingoMonitorBot`).
2. Copy the token into `TELEGRAM_BOT_TOKEN`.
3. Set `TELEGRAM_BOT_USERNAME` to the bot username without `@`.
4. Local development: leave `TELEGRAM_WEBHOOK_SECRET` empty. The worker uses polling.
5. Production: generate a random secret, set `TELEGRAM_WEBHOOK_SECRET`, then:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H 'content-type: application/json' \
  -d "{\"url\":\"https://YOUR_DOMAIN/api/webhooks/telegram\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

6. In PingoGo: Settings → Telegram → Connect Telegram, or complete onboarding.
7. Send `/menu` in the bot. Everything the dashboard does is available from inline buttons.
8. Send a test notification from Settings or from the bot (Notifications → Send test alert).

Connect tokens are stored as SHA-256 hashes and expire in 15 minutes.

### What the bot can do

The bot mirrors the product. One `Bot` instance from `packages/telegram-bot` is used by the
worker (long polling in development) and by `/api/webhooks/telegram` (production).

| Screen | Actions |
| --- | --- |
| Menu | site summary, plan usage, entry to every section |
| My sites | one button per site with status and latency |
| Site card | status, HTTP, latency, uptime 24h/7d/30d, last check/outage, SSL, domain, DNS; Check now, Pause/Resume, Incidents, Delete (with confirmation), open in dashboard |
| Add site | `/add <url>`, the ➕ button, or simply sending a URL |
| Incidents | last 10 incidents (all sites or one site) with duration and reason |
| Notifications | toggle downtime / recovery / SSL / domain / DNS alerts, send a test alert |
| Plan | current plan, limits, renewal date; Stripe checkout and billing portal when Stripe is configured |
| Account | profile, connection info, disconnect Telegram |
| Language | English / Русский — applies to the bot UI and to alert messages |

Commands: `/menu`, `/sites`, `/add`, `/incidents`, `/settings`, `/plan`, `/account`, `/language`, `/help`, `/cancel`.
The language defaults to the Telegram client language and is stored per connection.
Alerts include an “Open site” button that jumps straight to the site card.

### Telegram Mini App

`/tg` is a Telegram Mini App — the full product inside Telegram: sites list, site card with
uptime and latency, add / pause / check / delete, incidents, notification toggles, language,
plan and Stripe checkout. It follows the Telegram theme (light/dark) and uses the native back button.

How it works:

- Telegram passes `initData` to the page. `POST /api/telegram/webapp/auth` verifies its HMAC
  (see `apps/web/src/lib/telegram-webapp.ts`) and issues a short-lived signed token. The Mini App calls the regular `/api/*` routes with `Authorization: Bearer <token>`.
- Users who have not linked Telegram sign in with email + password right inside the Mini App
  (`POST /api/telegram/webapp/link`), which also links the Telegram account.
- Bot buttons (“📱 Open app”), alert buttons and the chat menu button open the Mini App.
  `?monitor=<id>` (or `start_param=monitor_<id>`) opens a site card directly.

Requirements: Telegram only opens Mini Apps over **public HTTPS**. Set `APP_URL` and
`NEXT_PUBLIC_APP_URL` to `https://YOUR_DOMAIN`. On localhost the bot silently hides the
Mini App buttons and keeps the command menu. The worker sets the chat menu button on start
(`setChatMenuButton`); no BotFather configuration is needed.

Local test with a tunnel: `ngrok http 3000`, set both URL variables to the `https://….ngrok-free.app`
URL, restart `web` and `worker`, then open the bot and tap the menu button.

The `/tg` page must be embeddable by `web.telegram.org`: `docker/Caddyfile` and
`apps/web/next.config.ts` send `Content-Security-Policy: frame-ancestors …telegram.org` for it
instead of `X-Frame-Options: DENY`. If you use your own proxy, keep that exception.

## Stripe setup

PingoGo keeps **two Stripe key sets** — sandbox (`STRIPE_TEST_*`) and live (`STRIPE_LIVE_*`) — and an admin
switches between them at `/admin` → Stripe without a redeploy. The active mode drives Checkout, the Customer
Portal and plan limits. Subscriptions remember which world they came from (`Subscription.providerMode`), so a
sandbox purchase grants nothing while live mode is on, and vice versa; nothing is deleted on switch.

Prices are resolved by **lookup key** (`pingo_personal_monthly`, `pingo_pro_monthly`, `pingo_agency_monthly`),
so you never paste price IDs. The catalog (one product per plan, a monthly price each, the Customer Portal
configuration) and the webhook endpoint are created with one click per mode from the admin panel, or:

```bash
pnpm stripe:setup -- --mode test
pnpm stripe:setup -- --mode live --webhook https://YOUR_DOMAIN/api/webhooks/stripe
```

Local demo (sandbox):

1. Put a sandbox secret key (`sk_test_…`, or a restricted `rk_test_…`) into `STRIPE_TEST_SECRET_KEY`.
2. `pnpm stripe:setup -- --mode test` creates products, prices and the portal configuration.
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the printed
   `whsec_…` into `STRIPE_TEST_WEBHOOK_SECRET`; restart `pnpm dev`.
4. Settings → Billing → pick a plan. Test card `4242 4242 4242 4242`, any future date, any CVC.

Production:

1. Set `STRIPE_TEST_SECRET_KEY` and `STRIPE_LIVE_SECRET_KEY` (restricted keys need: Checkout Sessions, Customers,
   Subscriptions, Prices, Products, Billing Portal, Webhook Endpoints — write).
2. In `/admin` → Stripe, press **Create products & prices** and **Register webhook** for each mode. The webhook
   signing secret is shown once — store it as `STRIPE_TEST_WEBHOOK_SECRET` / `STRIPE_LIVE_WEBHOOK_SECRET` and redeploy.
   Both modes post to the same URL; the signature tells them apart.
3. Test the whole flow in sandbox, then flip the toggle to **Live**.

Plan codes are internal (`FREE`, `PERSONAL`, `PRO`, `AGENCY`). Amounts come from `PLAN_PRICE_*`; re-running the
catalog setup after changing them creates new prices and moves the lookup keys (old prices are archived).

Existing paid users change plans in the Customer Portal (prorated); a fresh Checkout is only used for the first
purchase. On downgrade, extra monitors are **paused**, not deleted.

## Google and Facebook SSO

Redirect URLs for both providers:

- Google: `http://localhost:3000/api/auth/callback/google` (production: `https://YOUR_DOMAIN/api/auth/callback/google`)
- Facebook: `http://localhost:3000/api/auth/callback/facebook`

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client (Web).
2. Authorized JavaScript origin: `http://localhost:3000`
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `.env`.
4. Facebook Developer Portal → Create app → Facebook Login. Add the callback URL above.
5. Put `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` into `.env`. Restart `pnpm dev`.

Login and register show Google / Facebook buttons only when those keys are set. Existing email accounts with the same address are linked automatically.

## Email setup

1. Create a Resend account and verify a domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM`.
3. Used for email verification, password reset and payment-failed notices.

## Docker deployment

On a fresh Ubuntu VPS (2 vCPU / 4 GB RAM is enough to start):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

git clone YOUR_REPO pingo
cd pingo
cp .env.example .env
# edit .env: APP_URL, APP_SECRET, DATABASE_URL, REDIS_URL, secrets

# Internal compose network URLs for production:
# DATABASE_URL=postgresql://pingo:STRONG_PASSWORD@postgres:5432/pingo?schema=public
# REDIS_URL=redis://redis:6379

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm web pnpm db:migrate:deploy
docker compose -f docker-compose.prod.yml up -d
```

Point DNS to the VPS. Either:

- put the VPS behind Cloudflare HTTPS, publish port 3000 internally, or
- enable Caddy: `PINGO_DOMAIN=pingo.example.com docker compose -f docker-compose.prod.yml --profile caddy up -d`

Then configure Telegram and Stripe webhooks as above.

Health checks:

- `GET /api/health` — process liveness
- `GET /api/health/ready` — database, Redis, worker heartbeat

## Backups

```bash
chmod +x scripts/backup-postgres.sh
# cron: 0 3 * * * /opt/pingo/scripts/backup-postgres.sh
```

Retention is 14 days by default. Set `AWS_S3_BUCKET` to upload copies to S3.

## Default admin

The seed user `admin@pingo.local` is an admin. In production, set `ADMIN_EMAIL` to your email **before** the first registration, or promote a user in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Do not leave the seeded admin password in production.

## Production checklist

- [ ] production `APP_SECRET` generated
- [ ] database credentials changed
- [ ] HTTPS enabled
- [ ] Stripe webhook configured
- [ ] Telegram webhook configured
- [ ] Telegram Mini App opens from the bot menu button (`APP_URL` is public HTTPS)
- [ ] email domain verified
- [ ] backups configured
- [ ] Sentry configured
- [ ] DNS configured
- [ ] health endpoint tested
- [ ] SSRF tests passing
- [ ] legal pages reviewed
- [ ] seed demo passwords removed or changed

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Playwright (optional, app must be running):

```bash
pnpm --filter @pingo/web exec playwright test
```

## Account deletion

Settings → Security → Delete account removes the user and cascaded monitors, checks, Telegram links and local billing rows. If a Stripe subscription is active, PINGO cancels it first.

## Troubleshooting

- **Ready check fails** — worker is down or Redis/Postgres is unreachable. Check `docker compose ps` and worker logs.
- **Add monitor rejected as private** — SSRF protection blocked localhost or RFC1918. Use a public hostname.
- **Domain expiration unavailable** — the registry RDAP response had no expiry. This is expected for some TLDs; lookups retry daily.
- **No Telegram alerts** — bot token missing, chat not linked, or notification job failed. Check `/admin` Telegram errors and Redis.
- **Checkout 503** — Stripe env vars are missing.
- **Email not arriving** — Resend unset; verification links are logged by the email provider in development.

## Future features (not in this MVP)

Public status pages (route exists, flag off), Slack/Discord/email alerts, keyword/heartbeat monitors, organizations, API keys, typosquatting / similar-domain watch.
