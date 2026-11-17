import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
app.use(express.json());

// --- HLS Proxy Configuration & Logic ---
const ALLOWED_HOST_SUFFIXES = [
  'maximaimg.online',
  'animefire.plus',
  'animefire.net',
  'blogger.googleusercontent.com',
  'blogspot.com',
  'yourstream.xyz',
  'example.com',
  'test.com',
  'vidstreaming.io',
  'gogocdn.net',
  'test-streams.mux.dev',
  'unified-streaming.com'
];

const HOSTS_FALLBACK = ['cdn-sv02', 'cdn-sv03'];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const REFERERS: Record<string, string> = {
  "maximaimg.online": "https://animefire.plus/",
  "animefire.plus": "https://animefire.plus/",
  "animefire.net": "https://animefire.net/"
};

const TTL_PLAYLIST = 5; // seconds
const TTL_SEGMENT = 3600; // seconds
const urlCache = new Map<string, { body: string; expires: number }>();

function isHostAllowed(host: string): boolean {
  return ALLOWED_HOST_SUFFIXES.some(s => host === s || host.endsWith('.' + s));
}

function getRefererFor(host: string): string | null {
  for (const [suffix, ref] of Object.entries(REFERERS)) {
    if (host === suffix || host.endsWith('.' + suffix)) return ref;
  }
  return "https://animefire.plus/";
}

async function fetchUpstream(targetUrl: URL, extraHeaders: Record<string, string> = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    'Accept': '*/*',
    ...extraHeaders
  };
  const ref = getRefererFor(targetUrl.host);
  if (ref) {
    headers['Referer'] = ref;
  }
  
  try {
    const res = await fetch(targetUrl.href, {
      headers,
      redirect: 'follow'
    });
    return res;
  } catch (err) {
    console.error('Fetch upstream error for:', targetUrl.href, err);
    throw err;
  }
}

async function fetchWithHostRotation(targetUrl: URL, extraHeaders: Record<string, string> = {}): Promise<Response> {
  let res = await fetchUpstream(targetUrl, extraHeaders);
  if (res.status !== 429) return res;

  // Try fallback hosts
  for (const alt of HOSTS_FALLBACK) {
    const host = targetUrl.host.replace(/^cdn-sv\d+/, alt);
    if (host === targetUrl.host) continue;
    const clone = new URL(targetUrl.href);
    clone.host = host;
    try {
      res = await fetchUpstream(clone, extraHeaders);
      if (res.status !== 429) return res;
    } catch {
      continue;
    }
  }
  return res;
}

// CORREÇÃO 1: Caminho de reescrita derivado da requisição real (ex: /api/hls)
function rewritePlaylist(text: string, baseUrl: URL, reqUrl: string): string {
  const abs = (u: string) => new URL(u.trim(), baseUrl).href;
  const mount = new URL(reqUrl, 'http://localhost').pathname;
  const proxyUrl = (u: string) => mount + '?u=' + encodeURIComponent(u);

  // attributes URI="" (EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA)
  let rewritten = text.replace(/URI="([^"]+)"/g, (_, u) => `URI="${proxyUrl(abs(u))}"`);
  // lines of URI (segments and variants)
  rewritten = rewritten.replace(/^(?!#)(.+)$/gm, (line) => (line.trim() ? proxyUrl(abs(line)) : line));
  return rewritten;
}

// HLS Proxy Route (CORREÇÃO 4: CORS centralizado, preflight OPTIONS e fail helper)
app.all('/api/hls', async (req, res) => {
  const CORS = {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges',
  };

  const setCors = () => {
    res.set(CORS);
  };

  if (req.method === 'OPTIONS') {
    return res.status(204).set({
      ...CORS,
      'access-control-allow-headers': '*',
    }).end();
  }

  const raw = req.query.u as string;
  if (!raw) {
    setCors();
    return res.status(400).send('missing u parameter');
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    setCors();
    return res.status(400).send('bad u parameter');
  }

  if (!isHostAllowed(target.host)) {
    setCors();
    return res.status(403).send('host not allowed');
  }

  // CORREÇÃO 2: Detecção de playlist no alvo (.m3u8 / .m3u), sem olhar pathname da rota
  const isPlaylist = target.pathname.endsWith('.m3u8') || target.pathname.endsWith('.m3u');

  if (isPlaylist) {
    const cacheKey = 'p:' + target.href;
    const cached = urlCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expires > now) {
      setCors();
      return res.status(200)
        .set('Content-Type', 'application/vnd.apple.mpegurl')
        .set('Cache-Control', `public, max-age=${TTL_PLAYLIST}`)
        .send(cached.body);
    }

    try {
      const upstreamRes = await fetchWithHostRotation(target);
      if (!upstreamRes.ok) {
        setCors();
        return res.status(502).send('upstream ' + upstreamRes.status);
      }

      // CORREÇÃO 3: Guarda de conteúdo (verifica se começa com #EXTM3U)
      const bodyText = await upstreamRes.text();
      if (!bodyText.startsWith('#EXTM3U')) {
        setCors();
        return res.status(502).send('upstream não devolveu HLS (status ' + upstreamRes.status + '): ' + bodyText.slice(0, 200));
      }

      const rewritten = rewritePlaylist(bodyText, target, req.originalUrl || req.url);
      urlCache.set(cacheKey, { body: rewritten, expires: now + TTL_PLAYLIST * 1000 });

      setCors();
      return res.status(200)
        .set('Content-Type', 'application/vnd.apple.mpegurl')
        .set('Cache-Control', `public, max-age=${TTL_PLAYLIST}`)
        .send(rewritten);
    } catch (err: any) {
      setCors();
      return res.status(502).send('proxy error: ' + (err.message || 'unknown'));
    }
  }

  // Segment proxying with Range headers (Mantido conforme especificação)
  const extraHeaders: Record<string, string> = {};
  const range = req.headers['range'];
  if (range && typeof range === 'string') {
    extraHeaders['Range'] = range;
  }

  try {
    const upstreamRes = await fetchWithHostRotation(target, extraHeaders);
    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      setCors();
      return res.status(502).send('upstream ' + upstreamRes.status);
    }

    setCors();
    res.status(upstreamRes.status);
    res.set('Content-Type', upstreamRes.headers.get('content-type') || 'application/octet-stream');
    res.set('Accept-Ranges', 'bytes');
    
    const cr = upstreamRes.headers.get('content-range');
    if (cr) res.set('Content-Range', cr);
    const cl = upstreamRes.headers.get('content-length');
    if (cl) res.set('Content-Length', cl);
    res.set('Cache-Control', `public, max-age=${TTL_SEGMENT}, immutable`);

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (streamErr) {
        console.error('Stream pipe error:', streamErr);
        if (!res.headersSent) {
          res.status(500).send('Stream error');
        } else {
          res.end();
        }
      }
    } else {
      const buf = Buffer.from(await upstreamRes.arrayBuffer());
      res.send(buf);
    }
  } catch (err: any) {
    if (!res.headersSent) {
      setCors();
      res.status(502).send('segment proxy error');
    }
  }
});

// --- In-memory Episode Sources Database simulation ---
interface EpisodeSource {
  id: string;
  episode_id: string;
  provider: string;
  page_url: string;
  direct_url?: string;
  resolved_at?: string;
  priority: number;
  created_at: string;
}

let episodeSources: EpisodeSource[] = [
  {
    id: 'src-1',
    episode_id: 'ds-s1-e1',
    provider: 'maximaimg',
    page_url: 'https://animefire.plus/video/demon-slayer-episodio-1',
    direct_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolved_at: new Date().toISOString(),
    priority: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'src-2',
    episode_id: 'jk-s1-e1',
    provider: 'maximaimg',
    page_url: 'https://animefire.plus/video/jujutsu-kaisen-episodio-1',
    direct_url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    resolved_at: new Date().toISOString(),
    priority: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'src-3',
    episode_id: 'sl-s1-e1',
    provider: 'maximaimg',
    page_url: 'https://animefire.plus/video/solo-leveling-episodio-1',
    direct_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    resolved_at: new Date().toISOString(),
    priority: 0,
    created_at: new Date().toISOString()
  }
];

// Get sources for episode
app.get('/api/episode-sources/:episodeId', (req, res) => {
  const { episodeId } = req.params;
  const sources = episodeSources.filter(s => s.episode_id === episodeId).sort((a, b) => a.priority - b.priority);
  res.json(sources);
});

// Get all sources
app.get('/api/episode-sources', (req, res) => {
  res.json(episodeSources);
});

// Add or update source
app.post('/api/episode-sources', (req, res) => {
  const { episode_id, provider, page_url, direct_url, priority } = req.body;
  if (!episode_id || !provider || !page_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newSource: EpisodeSource = {
    id: 'src-' + Math.random().toString(36).substring(2, 9),
    episode_id,
    provider,
    page_url,
    direct_url: direct_url || undefined,
    resolved_at: direct_url ? new Date().toISOString() : undefined,
    priority: priority !== undefined ? Number(priority) : 0,
    created_at: new Date().toISOString()
  };

  episodeSources.push(newSource);
  res.status(201).json(newSource);
});

// Delete source
app.delete('/api/episode-sources/:id', (req, res) => {
  const { id } = req.params;
  const index = episodeSources.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Source not found' });
  }
  episodeSources.splice(index, 1);
  res.json({ success: true });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Hikari Anime server running on http://0.0.0.0:${port}`);
  });
}

startServer();
