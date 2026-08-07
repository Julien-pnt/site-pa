/**
 * LSPD Justice OS — Cloudflare Worker CORS Proxy
 * Relaie les requêtes vers l'API Anthropic en ajoutant les headers CORS.
 * La clé API est envoyée par le navigateur et transmise telle quelle — elle
 * n'est jamais stockée dans ce Worker.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request) {
        // Preflight CORS
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
        }

        const apiKey = request.headers.get('x-api-key');
        if (!apiKey || !apiKey.startsWith('sk-ant-')) {
            return new Response(
                JSON.stringify({ error: { message: 'Clé API manquante ou invalide.' } }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
        }

        let body;
        try {
            body = await request.text();
        } catch {
            return new Response(
                JSON.stringify({ error: { message: 'Corps de requête illisible.' } }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
            );
        }

        const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
            },
            body,
        });

        const responseText = await anthropicResponse.text();

        return new Response(responseText, {
            status: anthropicResponse.status,
            headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS,
            },
        });
    },
};
