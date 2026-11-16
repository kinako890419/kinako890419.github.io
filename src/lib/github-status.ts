export const EMOJI_SIZE = 8; // display size in card pixels; fits inside the bubble

export interface StatusSprite {
  /** data: URI of GitHub's emoji PNG (embedded, so visitors make no extra request) */
  src: string;
  shortcode: string;
  message: string | null;
}

const API = 'https://api.github.com';

function headers(token?: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'pixel-portfolio-build',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchStatus(user: string, token: string) {
  const res = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'query($login: String!) { user(login: $login) { status { emoji message } } }',
      variables: { login: user },
    }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e: { message: string }) => e.message).join('; '));
  return json.data?.user?.status as { emoji: string | null; message: string | null } | null;
}

async function load(user: string, fallback: string | undefined): Promise<StatusSprite | null> {
  const token = process.env.GH_STATUS_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  let shortcode: string | null | undefined = fallback;
  let message: string | null = null;

  if (token) {
    try {
      const status = await fetchStatus(user, token);
      shortcode = status?.emoji ?? null; // status cleared => empty bubble
      message = status?.message ?? null;
    } catch (e) {
      console.warn(`[github-status] could not read status for ${user}: ${(e as Error).message}`);
    }
  } else {
    console.warn('[github-status] no GITHUB_TOKEN set; using the fallback emoji');
  }

  if (!shortcode) return null;
  try {
    const name = shortcode.replace(/^:|:$/g, '');
    const emojis = (await (await fetch(`${API}/emojis`, { headers: headers(token) })).json()) as Record<string, string>;
    const url = emojis[name];
    if (!url) throw new Error(`unknown emoji :${name}:`);
    const png = await (await fetch(url)).arrayBuffer();
    const src = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
    return { src, shortcode: `:${name}:`, message };
  } catch (e) {
    console.warn(`[github-status] could not draw ${shortcode}: ${(e as Error).message}`);
    return null;
  }
}

// one request per build / dev-server process
const cache = new Map<string, Promise<StatusSprite | null>>();
export function getStatusSprite(user: string, fallback?: string) {
  const key = `${user}|${fallback ?? ''}`;
  if (!cache.has(key)) cache.set(key, load(user, fallback));
  return cache.get(key)!;
}
