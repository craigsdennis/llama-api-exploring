import { Hono } from 'hono';
import { streamText } from 'hono/streaming';
import LlamaAPIClient from 'llama-api-client';

interface Env {
	LLAMA_API_KEY: string;
}

type PhotoRequest = {
	image: string; // base64 encoded image
};

const app = new Hono<{ Bindings: Env }>();

app.post('/api/photos/describe', async (c) => {
	try {
		// Parse the request body to get the base64 image
		const body: PhotoRequest = await c.req.json();
		if (!body.image || !body.image.startsWith('data:image/')) {
			return c.json({ error: 'Invalid image format' }, 400);
		}

		// Initialize the Llama API client
		const client = new LlamaAPIClient({
			apiKey: c.env.LLAMA_API_KEY,
		});

		// Create a prompt for image description
		const tokenStream = await client.chat.completions.create({
			model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'Describe this image in detail. What do you see?' },
						{ type: 'image_url', image_url: { url: body.image } },
					],
				},
			],
			stream: true,
		});
		c.header('Content-Encoding', 'Identity');
		// Stream the response back to the client
		return streamText(c, async (stream) => {
			for await (const chunkEvent of tokenStream) {
				if (chunkEvent.event.delta.type === 'text') {
					stream.write(chunkEvent.event.delta.text);
				}
			}
		});
	} catch (error) {
		console.error('Error in /api/photos/describe:', error);
		return c.json({ error: 'Failed to process image' }, 500);
	}
});

app.post('/api/photos/extract', async (c) => {
	try {
		// Parse the request body to get the base64 image
		const body: PhotoRequest = await c.req.json();
		if (!body.image || !body.image.startsWith('data:image/')) {
			return c.json({ error: 'Invalid image format' }, 400);
		}

		// Initialize the Llama API client
		const client = new LlamaAPIClient({
			apiKey: c.env.LLAMA_API_KEY,
		});

		// Create a prompt for structured data extraction
		const response = await client.chat.completions.create({
			model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: 'Extract structured data from this image. Identify key objects, people, text, and any other important elements. Return the response as JSON with these fields: objects (array), text_content (string), scene_type (string), colors (array), and any other relevant attributes.',
						},
						{ type: 'image_url', image_url: { url: body.image } },
					],
				},
			],
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: "image_analysis",
					schema: {
						type: "object",
						properties: {
							objects: {
								type: "array",
								items: {
									type: "string"
								},
								description: "List of objects detected in the image"
							},
							text_content: {
								type: "string",
								description: "Any text found in the image"
							},
							scene_type: {
								type: "string",
								description: "Type of scene depicted in the image"
							},
							colors: {
								type: "array",
								items: {
									type: "string"
								},
								description: "Dominant colors in the image"
							},
							crucial_elements: {
								type: "array",
								items: {
									type: "string"
								},
								description: "Most important elements in the image"
							}
						},
						required: ["objects", "text_content", "scene_type", "colors", "crucial_elements"]
					}
				}
			},
		});

		// Return the structured data as JSON
		return c.json(JSON.parse(response.completion_message.content.text));
	} catch (error) {
		console.error('Error in /api/photos/extract:', error);
		return c.json({ error: 'Failed to extract data from image' }, 500);
	}
});

export default app;
