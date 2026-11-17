export interface ResolvedSource {
  directUrl: string | null;
  iframeUrl: string;
  provider?: string;
  pageUrl?: string;
}

export async function resolveEpisode(episodeId: string, defaultIframeUrl: string): Promise<ResolvedSource> {
  try {
    const res = await fetch(`/api/episode-sources/${episodeId}`);
    if (!res.ok) {
      return { directUrl: null, iframeUrl: defaultIframeUrl };
    }
    const sources = await res.json();
    if (!sources || sources.length === 0) {
      return { directUrl: null, iframeUrl: defaultIframeUrl };
    }

    // Pick highest priority source
    const primary = sources[0];
    let directUrl = primary.direct_url || null;

    // Check if resolved_at is older than 10 minutes or missing
    if (primary.page_url && (!primary.resolved_at || (Date.now() - new Date(primary.resolved_at).getTime() > 10 * 60 * 1000))) {
      // In production, this would re-scrape or re-resolve page_url. For now we use direct_url or simulate resolution.
      if (!directUrl && primary.page_url.includes('demon-slayer')) {
        directUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
      }
    }

    return {
      directUrl: directUrl ? `/api/hls?u=${encodeURIComponent(directUrl)}` : null,
      iframeUrl: defaultIframeUrl,
      provider: primary.provider,
      pageUrl: primary.page_url
    };
  } catch (err) {
    console.error('Error resolving episode source:', err);
    return { directUrl: null, iframeUrl: defaultIframeUrl };
  }
}
