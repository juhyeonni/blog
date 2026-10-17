# blog

A static blog on GitHub Pages: Markdown posts in Korean and Japanese, keyword search, GitHub login and one-line reactions. Built with Astro.

```
npm run dev         # local site
npm run build       # production build into dist/
npm test            # unit tests, no network
npm run embeddings  # optional: vectors for meaning search (downloads a 118 MB model once)
```

Setup for login and reactions: [`worker/README.md`](worker/README.md).

## Meaning search (optional)

The search window has an off-by-default switch, "의미 검색". A reader who agrees downloads about 132 MB (the `Xenova/multilingual-e5-small` model from Hugging Face and a 14 MB WebAssembly engine from this site) and the search then runs on their own device; nothing is sent anywhere.

- `npm run embeddings` embeds every paragraph of every post and writes `public/embeddings.json` (not committed). The deploy workflow runs it and, only if it succeeds, builds with `PUBLIC_SEMANTIC=1`, which is what shows the switch.
- Without that variable, or without the vectors file, the site has no trace of the feature. `npm run build` never needs the model or the network.
- A result needs a cosine score of at least 0.82 (`MIN_SCORE` in `src/lib/semantic.ts`); tune it once there are real posts.
