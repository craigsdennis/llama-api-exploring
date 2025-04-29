# Exploring the new Llama API

Meta launched a new API on 4/29. This is an exploration.

## Develop

Copy [`./dev.vars.example`](./.dev.vars.example) to `./dev/vars`

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
