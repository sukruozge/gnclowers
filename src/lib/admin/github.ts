/**
 * Minimal GitHub REST client for the admin panel: reads/writes repo file
 * contents, dispatches workflows, and lists recent commits.
 *
 * Worker-safe: uses only `fetch`, `TextEncoder`/`TextDecoder`, and `atob`/
 * `btoa` — no `Buffer` — so it runs unmodified in Cloudflare Workers.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface Gh {
  token: string;
  repo: string;
  fetchImpl?: typeof fetch;
}

function baseUrl(gh: Gh): string {
  return `https://api.github.com/repos/${gh.repo}`;
}

function baseHeaders(gh: Gh, withBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${gh.token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'aselovers-admin',
  };
  if (withBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw new Error(`github ${res.status}`);
  }
}

/** UTF-8-safe base64 encode: TextEncoder -> bytes -> binary string in chunks -> btoa. */
function utf8ToBase64(input: string): string {
  const bytes = textEncoder.encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** UTF-8-safe base64 decode: strip whitespace/newlines -> atob -> bytes -> TextDecoder. */
function base64ToUtf8(input: string): string {
  const cleaned = input.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return textDecoder.decode(bytes);
}

export async function ghGetFile(gh: Gh, path: string): Promise<{ content: string; sha: string }> {
  const fetchFn = gh.fetchImpl ?? fetch;
  const res = await fetchFn(`${baseUrl(gh)}/contents/${path}?ref=main`, {
    method: 'GET',
    headers: baseHeaders(gh, false),
  });
  await assertOk(res);
  const data = (await res.json()) as { content: string; sha: string };
  return { content: base64ToUtf8(data.content), sha: data.sha };
}

export async function ghPutFile(
  gh: Gh,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  const fetchFn = gh.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    message,
    content: utf8ToBase64(content),
    branch: 'main',
    committer: { name: 'aselovers-admin', email: 'admin@aseloves.com' },
  };
  if (sha !== undefined) {
    body.sha = sha;
  }
  const res = await fetchFn(`${baseUrl(gh)}/contents/${path}`, {
    method: 'PUT',
    headers: baseHeaders(gh, true),
    body: JSON.stringify(body),
  });
  await assertOk(res);
}

export async function ghDispatchWorkflow(gh: Gh, workflowFile: string): Promise<void> {
  const fetchFn = gh.fetchImpl ?? fetch;
  const res = await fetchFn(`${baseUrl(gh)}/actions/workflows/${workflowFile}/dispatches`, {
    method: 'POST',
    headers: baseHeaders(gh, true),
    body: JSON.stringify({ ref: 'main' }),
  });
  await assertOk(res);
}

export async function ghRecentCommits(
  gh: Gh,
  n: number
): Promise<{ sha: string; message: string; date: string }[]> {
  const fetchFn = gh.fetchImpl ?? fetch;
  const res = await fetchFn(`${baseUrl(gh)}/commits?per_page=${n}&sha=main`, {
    method: 'GET',
    headers: baseHeaders(gh, false),
  });
  await assertOk(res);
  const data = (await res.json()) as {
    sha: string;
    commit: { message: string; committer: { date: string } };
  }[];
  return data.map((item) => ({
    sha: item.sha.slice(0, 7),
    message: item.commit.message.split('\n')[0],
    date: item.commit.committer.date,
  }));
}

export async function ghGetFileSha(gh: Gh, path: string): Promise<string | undefined> {
  const fetchFn = gh.fetchImpl ?? fetch;
  try {
    const res = await fetchFn(`${baseUrl(gh)}/contents/${path}?ref=main`, {
      method: 'GET',
      headers: baseHeaders(gh, false),
    });
    if (res.status === 404) return undefined;
    if (!res.ok) return undefined;
    const data = (await res.json()) as { sha: string };
    return data.sha;
  } catch {
    return undefined;
  }
}

export async function ghPutBinaryFile(
  gh: Gh,
  path: string,
  base64Content: string,
  message: string,
  sha?: string
): Promise<void> {
  const fetchFn = gh.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    message,
    content: base64Content,
    branch: 'main',
    committer: { name: 'aselovers-admin', email: 'admin@aseloves.com' },
  };
  if (sha !== undefined) {
    body.sha = sha;
  }
  const res = await fetchFn(`${baseUrl(gh)}/contents/${path}`, {
    method: 'PUT',
    headers: baseHeaders(gh, true),
    body: JSON.stringify(body),
  });
  await assertOk(res);
}
