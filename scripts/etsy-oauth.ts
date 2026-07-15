/**
 * One-time Etsy OAuth 2.0 (PKCE) helper.
 *
 * Etsy's inventory/variation endpoint (getListingInventory) needs an OAuth token
 * with the `listings_r` scope — the plain API key is not enough. Run this once to
 * authorise your shop and obtain a long-lived REFRESH TOKEN. Put that token into
 * the `ETSY_REFRESH_TOKEN` GitHub Actions secret; the daily sync then uses it to
 * pull product options/variants.
 *
 * Prerequisites:
 *   1. In your Etsy app (developers.etsy.com → your app → "App settings"),
 *      add this Redirect URI:  http://localhost:3003/oauth/callback
 *   2. Have your app's keystring (API key) ready.
 *
 * Run:
 *   ETSY_API_KEY=your_keystring npm run etsy-auth
 *   (on Windows PowerShell:  $env:ETSY_API_KEY="your_keystring"; npm run etsy-auth)
 *
 * A browser tab opens; log in and click "Allow access". The script prints your
 * refresh token. Copy it into the ETSY_REFRESH_TOKEN secret.
 */
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { exec } from 'node:child_process';

const API_KEY = process.env.ETSY_API_KEY ?? '';
const PORT = 3003;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
const SCOPE = 'listings_r';

if (!API_KEY) {
  console.error('\n✗ ETSY_API_KEY is not set. Run:  ETSY_API_KEY=your_keystring npm run etsy-auth\n');
  process.exit(1);
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const codeVerifier = base64url(randomBytes(64));
const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
const state = base64url(randomBytes(16));

const authUrl =
  'https://www.etsy.com/oauth/connect?' +
  new URLSearchParams({
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    client_id: API_KEY,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString();

async function exchangeCode(code: string): Promise<any> {
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: API_KEY,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname !== '/oauth/callback') { res.writeHead(404).end('Not found'); return; }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  if (returnedState !== state || !code) {
    res.writeHead(400).end('Invalid state or missing code. Close this tab and try again.');
    return;
  }
  try {
    const tokens = await exchangeCode(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
      '<h2>✓ Yetkilendirme tamam</h2><p>Bu sekmeyi kapatabilirsiniz. Refresh token terminale yazıldı.</p>',
    );
    console.log('\n✓ Success! Add this to your GitHub secret ETSY_REFRESH_TOKEN:\n');
    console.log('  ' + tokens.refresh_token + '\n');
    console.log('(access token expires in', tokens.expires_in, 'seconds — the sync refreshes it automatically.)\n');
  } catch (err) {
    res.writeHead(500).end('Token exchange failed — see terminal.');
    console.error('\n✗', err instanceof Error ? err.message : err, '\n');
  } finally {
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  }
});

server.listen(PORT, () => {
  console.log('\nOpening Etsy authorisation in your browser…');
  console.log('If it does not open, paste this URL manually:\n\n  ' + authUrl + '\n');
  const opener = process.platform === 'win32' ? `start "" "${authUrl}"`
    : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener, () => { /* ignore if it can't auto-open */ });
});
