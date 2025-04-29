import { Hono } from 'hono';
import LlamaAPIClient from 'llama-api-client';

const app = new Hono<{ Bindings: Env }>();

app.get('/api/describe', async (c) => {
	const client = new LlamaAPIClient({
		apiKey: c.env.LLAMA_API_KEY,
	});
});

app.get('/api/extract/features', async (c) => {
	return c.json({ hello: 'world' });
});

export default app;
