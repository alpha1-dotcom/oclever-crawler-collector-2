# OClever crawler collector (Cloudflare Worker)

A tiny Worker that sits in front of your site, passes every request through
unchanged, and reports requests from bots and AI crawlers (GPTBot, ClaudeBot,
PerplexityBot and similar) to [OClever](https://oclever.com) so they appear on
your Crawlability page. Reporting happens after the response is sent and can
never break or slow your site.

Only requests whose user agent looks like a bot are reported, and static
assets and health checks are skipped. OClever classifies the exact bot on its
side.

## Deploy with one click

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Oclever-ai/cloudflare-worker)

The deploy flow asks for `INGEST_KEY` (get it in OClever: Crawlability, then
Connect logs) and `API_BASE` (leave the default `https://api.oclever.com`).

## Manual steps

```sh
git clone https://github.com/Oclever-ai/cloudflare-worker && cd cloudflare-worker
npm install
npx wrangler login
npx wrangler secret put INGEST_KEY   # paste your ik_... key
npx wrangler deploy
```

For local testing: `cp .dev.vars.example .dev.vars`, fill in `INGEST_KEY`,
then `npx wrangler dev`.

## Attach it to your site

Deploying alone does not put the Worker in front of your site. Your domain
must be on Cloudflare (proxied, orange cloud). In the Cloudflare dashboard:
Workers & Pages, select `oclever-crawler-collector`, Settings, Domains &
Routes, Add, Route. Enter `yoursite.com/*` (add `www.yoursite.com/*` if
needed) and pick your zone.

## Deploying again, or "A repository with that name already exists"

The Deploy button saves a copy of this Worker into your own GitHub account,
named after the Project name. If you deployed before, that name is taken.

- **Just need a new ingest key?** Do not redeploy. In Cloudflare open the Worker,
  Settings, Variables and Secrets, and replace `INGEST_KEY`.
- **Want a second copy** (another site or account)? Change the Project name on
  the deploy screen, for example `oclever-crawler-collector-2`.

## Verify data is arriving

1. Send a test request that looks like a bot:
   `curl -A "GPTBot/1.0" https://yoursite.com/`
2. Within a minute or so, check OClever's Crawlability page for a GPTBot hit.
3. Cloudflare dashboard: the Worker's Observability / logs view shows
   invocations. A 401/403 from OClever means the key is wrong.

## Uninstall

Remove the route (Domains & Routes) so traffic stops going through the Worker,
then delete the Worker (Settings, Delete) or run `npx wrangler delete`.
Optionally rotate the ingest key in OClever.

## Privacy: what is sent

For each reported request only: the full request URL, the User-Agent header,
and the response status code. No IP address, cookies, other headers, or request
or response bodies are sent. Human traffic is not reported.

## License

MIT
