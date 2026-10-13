# Login function and reactions setup

A GitHub Pages site cannot finish a GitHub login alone: swapping the login code for a token needs the app's secret. This Cloudflare Worker does that one step and nothing else. It has one route, `GET /callback`, no storage and no database, and it only ever redirects to the site origin set in `wrangler.toml`.

```
reader ──► github.com/login/oauth/authorize ──► worker /callback ──► site /auth/callback/#token=…&state=…
```

Reactions (one-line comments on a paragraph) are stored as comments on Issues in a separate public repository, and the reader's own token writes them. That is why the login is a **GitHub App**: its token can only write where the app is installed, while an OAuth App's `public_repo` scope would let the token write to any public repository the reader owns.

## One-time setup

These steps need your GitHub and Cloudflare accounts, so they are yours to do. Steps 1 to 5 give you login; step 6 turns on reactions. Until a step is done, its feature is simply not shown and the rest of the site works.

1. **Create the data repository.** A new public repository, for example `juhyeonni/blog-reactions`, with Issues enabled. It stays empty except for Issues.
2. **Create the GitHub App.** GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
   - Homepage URL: `https://juhyeonni.github.io/blog/`
   - Callback URL: `https://<worker-name>.<your-subdomain>.workers.dev/callback` (you get this address in step 4; you can edit it later)
   - Uncheck **Expire user authorization tokens** (so readers stay signed in) and uncheck **Webhook → Active**.
   - Repository permissions: **Issues: Read and write**. Nothing else.
   - Where can this app be installed: **Any account** (readers must be able to authorize it).
   - Create it, copy the **Client ID**, and generate a **client secret**.
3. **Install the App** on your account, restricted to the data repository only.
4. **Deploy the Worker.** Put the Client ID in `GITHUB_CLIENT_ID` in `worker/wrangler.toml` and check `SITE_ORIGIN` and `SITE_BASE`. From the `worker` folder: `npx wrangler login`, `npx wrangler deploy` (note the address it prints, and put it in the App's callback URL), then `npx wrangler secret put GITHUB_CLIENT_SECRET` and paste the secret. It is stored by Cloudflare, never in this repo.
5. **Tell the site.** In the repo: Settings → Secrets and variables → Actions → Variables. Add `PUBLIC_GITHUB_CLIENT_ID` (the Client ID) and `PUBLIC_AUTH_URL` (the Worker address, no trailing slash).
6. **Turn on reactions.** Add the variable `PUBLIC_REACTIONS_REPO` (`juhyeonni/blog-reactions`). Create a fine-grained personal access token limited to the data repository with **Issues: Read and write**, and save it as the Actions secret `REACTIONS_TOKEN`. Re-run the deploy workflow: it creates one Issue per post in the data repository and builds the site with their numbers.

## How reactions are stored

One Issue per post, titled `post: <slug>`, labelled `reactions`. Each reaction is one comment whose first line is `<!-- blog-reaction v1 {"lang":"ko","block":3,"hash":"a1b2c3"} -->` followed by the text. Comments without that line are ignored. A reader can delete their own comment and you (the repository owner) can delete any, from the page or from GitHub itself.

If you edit a paragraph, reactions written on the old text are hidden (they stay in the Issue). Reading reactions needs no login and loads at most 300 comments per post.

## Local checks

`npm test` runs this function's tests, the reaction rules and the Issue script's tests with fakes; none of them reach GitHub.

## Notes

- Logging out removes the token from the browser. It is not revoked at GitHub; revoke it at GitHub → Settings → Applications if needed.
- Moderation is deletion only: delete a comment in the data repository or from the page.
