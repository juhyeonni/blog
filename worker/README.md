# Login function

A GitHub Pages site cannot finish a GitHub login alone: swapping the login code for a token needs the OAuth app's secret. This Cloudflare Worker does that one step and nothing else. It has one route, `GET /callback`, no storage and no database, and it only ever redirects to the site origin set in `wrangler.toml`.

```
reader ──► github.com/login/oauth/authorize ──► worker /callback ──► site /auth/callback/#token=…&state=…
```

## One-time setup

These steps need your GitHub and Cloudflare accounts, so they are yours to do.

1. **Create the OAuth app.** GitHub → Settings → Developer settings → OAuth Apps → New. Homepage URL: `https://juhyeonni.github.io/blog/`. Authorization callback URL: `https://<worker-name>.<your-subdomain>.workers.dev/callback` (you get this address in step 3; you can come back and edit it). Copy the client id and generate a client secret.
2. **Fill in `wrangler.toml`.** Put the client id in `GITHUB_CLIENT_ID`. Check that `SITE_ORIGIN` and `SITE_BASE` match where the site is served.
3. **Deploy.** From this folder: `npx wrangler login`, then `npx wrangler deploy`. Note the address it prints.
4. **Set the secret.** `npx wrangler secret put GITHUB_CLIENT_SECRET` and paste the client secret. It is stored by Cloudflare, never in this repo.
5. **Tell the site.** In the repo: Settings → Secrets and variables → Actions → Variables. Add `PUBLIC_GITHUB_CLIENT_ID` (the client id) and `PUBLIC_AUTH_URL` (the worker address from step 3, no trailing slash). Re-run the deploy workflow.

Until step 5 is done the site shows no login button and everything else works.

## Local checks

`npm test` runs this function's tests with a fake `fetch`; they never reach GitHub.

## Notes

- No OAuth scope is requested, so the token can only read public profile data.
- Logging out removes the token from the browser. It is not revoked at GitHub; revoke it at GitHub → Settings → Applications if needed.
