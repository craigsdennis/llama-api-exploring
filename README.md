# Exploring the new Llama API

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/craigsdennis/llama-api-exploring)


Meta launched a new [LLama API on April 29th](https://llama.developer.meta.com/docs/). This is an exploration of that API using [Cloudflare Workers](https://developers.cloudflare.com) and [Hono](https://honojs.dev).

## Develop

Copy [`./dev.vars.example`](./.dev.vars.example) to `./dev.vars`

```bash
npm run dev
```

## Deploy

Upload your secrets

```bash
npx wrangler secret bulk .dev.vars
```

```bash
npm run deploy
```
