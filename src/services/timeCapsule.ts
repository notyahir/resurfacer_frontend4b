import { API_BASE_URL } from '../config';
import { getTracks, type TrackMetadata } from './libraryCache';

export type TimeCapsuleSource =
  | 'api-scores'
  | 'api-bootstrap'
  | 'api-unknown'
  | 'snapshot'
  | 'snapshot-empty'
  | 'snapshot-error';

export interface TimeCapsuleTrack {
  trackId: string;
  title: string;
  artist: string;
  stalenessPercent: number;
  lastPlayedRelative: string;
  lastPlayedAbsolute: string;
}

type PreviewSource = 'scores' | 'bootstrap' | 'empty' | 'unknown';

interface PreviewItem {
  trackId: string;
  score?: number;
  lastPlayedAt?: number;
  addedAt?: number;
}

interface LibrarySnapshot {
  tracks: Array<{
    trackId: string;
    title: string;
    artist: string;
  }>;
  likes: Array<{
    trackId: string;
    addedAt: number;
  }>;
}

const TRACK_SCORING_ENDPOINTS = [
  '/api/TrackScoring/preview',
  '/api/TrackScoring/Preview',
  '/api/trackscoring/preview',
  '/TrackScoring/preview',
  '/trackscoring/preview'
];
let snapshotPromise: Promise<LibrarySnapshot> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toMilliseconds(timestamp: number | undefined): number | undefined {
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return undefined;
  }
  return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000;
}

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));

  if (diffSeconds < 45) return 'moments ago';
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 18) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

  const diffYears = Math.round(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

async function loadSnapshot(): Promise<LibrarySnapshot> {
  if (!snapshotPromise) {
    const url = new URL('../data/library_sync_payload.json', import.meta.url).href;
    snapshotPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load library snapshot (${response.status})`);
        }
        return response.json() as Promise<LibrarySnapshot>;
      })
      .catch((error) => {
        snapshotPromise = null;
        throw error;
      });
  }

  return snapshotPromise;
}

function normalisePreviewEntry(entry: unknown): PreviewItem | null {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return { trackId: entry };
  }

  if (typeof entry === 'object') {
    const item = entry as Record<string, unknown>;
    const trackId = typeof item.trackId === 'string' ? item.trackId : typeof item.id === 'string' ? item.id : null;
    if (!trackId) {
      return null;
    }

    const scoreCandidate = item.score ?? item.staleness ?? item.value ?? item.weight;
    const score = typeof scoreCandidate === 'number' ? scoreCandidate : undefined;
    
      // Extract lastPlayedAt WITHOUT falling back to addedAt
      const lastPlayedCandidate =
        item.lastPlayedAt ??
        item.last_played_at ??
        item.lastTouchedAt ??
        item.lastTouched ??
        item.last_seen_at;
      const lastPlayedAt = typeof lastPlayedCandidate === 'number' ? lastPlayedCandidate : undefined;
    
      // Extract addedAt separately
      const addedAtCandidate = item.addedAt ?? item.added_at;
      const addedAt = typeof addedAtCandidate === 'number' ? addedAtCandidate : undefined;
    
      // Debug logging for staleness issue
      if (trackId && (lastPlayedAt || addedAt)) {
        console.log(`[TimeCapsule] Track ${trackId}: lastPlayedAt=${lastPlayedAt}, addedAt=${addedAt}, score=${score}`);
      }

      return { trackId, score, lastPlayedAt, addedAt };
  }

  return null;
}

interface PreviewResult {
  items: PreviewItem[];
  source: PreviewSource;
}

async function requestPreview(userId: string, size: number): Promise<PreviewResult> {
  const payload = { userId, size };
  let lastError: unknown = null;

  for (const endpoint of TRACK_SCORING_ENDPOINTS) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `TrackScoring request failed: ${response.status}`);
      }

      const data = await response.json();

      const previewSource: PreviewSource =
        typeof data?.source === 'string' && ['scores', 'bootstrap', 'empty'].includes(data.source)
          ? (data.source as PreviewSource)
          : 'unknown';

      const rawItems: unknown[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.tracks)
          ? data.tracks
          : Array.isArray(data?.trackIds)
            ? data.trackIds
            : Array.isArray(data?.items)
              ? data.items
              : [];

      const items = rawItems
        .map(normalisePreviewEntry)
        .filter((entry): entry is PreviewItem => entry !== null && typeof entry.trackId === 'string');

  return { items, source: previewSource };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Unable to load TrackScoring preview');
}

interface IntermediateTrack {
  trackId: string;
  title: string;
  artist: string;
  lastPlayedMs?: number;
  scoreHint?: number;
}

function finaliseTracks(items: IntermediateTrack[]): TimeCapsuleTrack[] {
  const now = Date.now();
  
  const diffs = items
    .map((item) => (typeof item.lastPlayedMs === 'number' ? Math.max(0, now - item.lastPlayedMs) : undefined))
    .filter((value): value is number => typeof value === 'number');

  const processed = items.map((item, index) => {
      const lastPlayedDisplay =
        typeof item.lastPlayedMs === 'number'
          ? {
              relative: formatRelative(new Date(item.lastPlayedMs)),
              absolute: new Date(item.lastPlayedMs).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            }
          : { relative: 'No recent plays', absolute: '—' };

      let staleness: number;
      
      // Priority 1: Use backend's score if available
      if (typeof item.scoreHint === 'number') {
        staleness = Math.round(item.scoreHint);
      } 
      // Priority 2: Calculate from lastPlayedMs with heavy weighting on recency
      else if (typeof item.lastPlayedMs === 'number' && diffs.length) {
        const ageMs = now - item.lastPlayedMs;
        const ageYears = ageMs / (365 * 24 * 60 * 60 * 1000);
        
        // More aggressive scoring: 
        // - < 1 year: 0-30
        // - 1-2 years: 30-50
        // - 2-3 years: 50-70
        // - 3-5 years: 70-90
        // - 5+ years: 90-100
        if (ageYears < 1) {
          staleness = Math.min(30, Math.round(ageYears * 30));
        } else if (ageYears < 2) {
          staleness = 30 + Math.round((ageYears - 1) * 20);
        } else if (ageYears < 3) {
          staleness = 50 + Math.round((ageYears - 2) * 20);
        } else if (ageYears < 5) {
          staleness = 70 + Math.round((ageYears - 3) * 10);
        } else {
          staleness = 90 + Math.min(10, Math.round((ageYears - 5) * 2));
        }
      } 
      // Priority 3: No timestamp data
      else {
        staleness = 70 - index * 3;
      }

      return {
        trackId: item.trackId,
        title: item.title,
        artist: item.artist,
        stalenessPercent: clamp(staleness, 0, 100),
        lastPlayedRelative: lastPlayedDisplay.relative,
        lastPlayedAbsolute: lastPlayedDisplay.absolute
      } satisfies TimeCapsuleTrack;
    });

  // Always randomize the track order for variety
  console.log('[TimeCapsule] Randomizing', processed.length, 'tracks');
  
  return processed
    .map((track) => ({ ...track, _rand: Math.random() }))
    .sort((a, b) => b._rand - a._rand)
    .map(({ _rand, ...track }) => track);
}

async function buildTracks(preview: PreviewItem[]): Promise<IntermediateTrack[]> {
  const snapshot = await loadSnapshot().catch(() => null);
  const snapshotTrackMap = new Map<string, { title: string; artist: string }>();
  const snapshotLikeMap = new Map<string, number>();

  if (snapshot) {
    for (const track of snapshot.tracks) {
      snapshotTrackMap.set(track.trackId, { title: track.title, artist: track.artist });
    }
    for (const like of snapshot.likes) {
      snapshotLikeMap.set(like.trackId, like.addedAt);
    }
  }

  let metadata: TrackMetadata[] = [];
  try {
    metadata = await getTracks(preview.map((entry) => entry.trackId));
  } catch (error) {
    console.warn('TimeCapsule: unable to load track metadata, continuing with snapshot fallbacks.', error);
  }

  const metadataMap = new Map(metadata.map((item) => [item.trackId, item]));

  return preview.map((entry) => {
    const meta = metadataMap.get(entry.trackId);
    const snapshotMeta = snapshotTrackMap.get(entry.trackId);

    const title = meta?.title ?? snapshotMeta?.title ?? entry.trackId;
    const artist = meta?.artist ?? snapshotMeta?.artist ?? 'Unknown artist';

    // Only use lastPlayedAt from backend - do NOT fall back to addedAt/likedAt
    // The backend should be handling the max(lastPlayedAt, likedAt) logic
    const lastPlayedMs = toMilliseconds(entry.lastPlayedAt);

    return {
      trackId: entry.trackId,
      title,
      artist,
      lastPlayedMs,
      scoreHint: entry.score
    } satisfies IntermediateTrack;
  });
}

async function buildFallback(size: number): Promise<TimeCapsuleTrack[]> {
  const snapshot = await loadSnapshot();
  const likesSorted = [...snapshot.likes].sort((a, b) => a.addedAt - b.addedAt).slice(0, size);
  const preview: PreviewItem[] = likesSorted.map((like) => ({ trackId: like.trackId, lastPlayedAt: like.addedAt }));
  const intermediate = await buildTracks(preview);
  return finaliseTracks(intermediate).slice(0, size);
}

function mapPreviewSource(source: PreviewSource): TimeCapsuleSource {
  switch (source) {
    case 'scores':
      return 'api-scores';
    case 'bootstrap':
      return 'api-bootstrap';
    case 'empty':
      return 'api-unknown';
    default:
      return 'api-unknown';
  }
}

function mapFallbackSource(source: PreviewSource | null, encounteredError: boolean): TimeCapsuleSource {
  if (encounteredError) {
    return 'snapshot-error';
  }

  if (source === 'empty') {
    return 'snapshot-empty';
  }

  return 'snapshot';
}

export async function loadTimeCapsuleTracks(
  userId: string,
  size = 12
): Promise<{ tracks: TimeCapsuleTrack[]; source: TimeCapsuleSource }> {
  let previewSource: PreviewSource | null = null;
  let encounteredError = false;
  
  // Fetch 500 tracks from backend for better variety, then randomize and take the requested size
  const fetchSize = 500;

  try {
    const { items, source } = await requestPreview(userId, fetchSize);
    previewSource = source;

    if (items.length) {
      const intermediate = await buildTracks(items);
      const allTracks = finaliseTracks(intermediate);
      const tracks = allTracks.slice(0, size);

      if (tracks.length) {
        return { tracks, source: mapPreviewSource(source) };
      }
    }

    console.info('TrackScoring preview returned no tracks; using snapshot fallback.', { source });
  } catch (error) {
    encounteredError = true;
    console.warn('Falling back to snapshot time capsule data.', error);
  }

  const fallbackTracks = await buildFallback(size);
  const fallbackSource = mapFallbackSource(previewSource, encounteredError);
  return { tracks: fallbackTracks, source: fallbackSource };
}
