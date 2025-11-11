import { API_BASE_URL } from '../config'
import { getDemoLikedTrackIds, getDemoTrackMeta } from '../data/demoLibraryCache'
import { getSessionCredentials, isAuthError, handleAuthError } from './session'

type HttpMethod = 'GET' | 'POST'

const LIBRARY_BASE_PATHS = ['/api/LibraryCache', '/api/librarycache', '/api/library-cache']

async function requestJson<T>(path: string, method: HttpMethod, body?: object): Promise<T> {
  let lastError: unknown = null

  const requestBody = method === 'POST' 
    ? { ...getSessionCredentials(), ...(body ?? {}) }
    : undefined

  for (const base of LIBRARY_BASE_PATHS) {
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
    const endpoint = path.startsWith('/') ? path : `/${path}`
    const url = `${API_BASE_URL}${normalizedBase}${endpoint}`

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: requestBody ? JSON.stringify(requestBody) : undefined
      })

      if (!response.ok) {
        const text = await response.text()
        const error = new Error(text || `LibraryCache request failed (${response.status}) at ${endpoint}`)
        
        if (isAuthError(error)) {
          handleAuthError(error)
        }
        
        throw error
      }

      const text = await response.text()
      return (text ? (JSON.parse(text) as T) : ({} as T))
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error(`Unable to reach LibraryCache endpoint ${path}`)
}

function parseLikedResponse(payload: any): string[] {
  if (!payload) return []
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object' && Array.isArray(entry.trackIds)) {
        return entry.trackIds
      }
      return []
    })
  }

  if (Array.isArray(payload?.trackIds)) {
    return payload.trackIds
  }

  if (Array.isArray(payload?.entries)) {
    return payload.entries
  }

  return []
}

export type LikedTracksSource = 'api' | 'offline-demo'

export interface LikedTracksResult {
  trackIds: string[]
  source: LikedTracksSource
}

export async function getLikedTracks(userId: string): Promise<LikedTracksResult> {
  const attempts: Array<() => Promise<any>> = [
    () => requestJson('/getLiked', 'POST', { userId }),
    () => requestJson('/_getLiked', 'POST', { userId }),
    () => requestJson(`/likedTracks?userId=${encodeURIComponent(userId)}`, 'GET'),
    () => requestJson(`/liked-tracks?userId=${encodeURIComponent(userId)}`, 'GET')
  ]

  for (const attempt of attempts) {
    try {
      const payload = await attempt()
      const trackIds = parseLikedResponse(payload)
      if (trackIds.length) {
        return { trackIds, source: 'api' }
      }
    } catch (error) {
    }
  }

  const fallbackIds = getDemoLikedTrackIds()
  if (fallbackIds.length) {
    console.warn('LibraryCache fallback: serving offline liked tracks snapshot.')
    return { trackIds: fallbackIds, source: 'offline-demo' }
  }

  return { trackIds: [], source: 'api' }
}

export interface TrackMetadata {
  trackId: string
  title: string
  artist: string
  available?: boolean
  tempo?: number | null
  energy?: number | null
  valence?: number | null
  album?: string
  source?: 'api' | 'demo'
}

function normaliseTrackMetadata(entry: any): TrackMetadata | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const trackId = typeof entry.trackId === 'string' ? entry.trackId : typeof entry.id === 'string' ? entry.id : null
  if (!trackId) {
    return null
  }

  const title = typeof entry.title === 'string' ? entry.title : undefined
  const artist = typeof entry.artist === 'string' ? entry.artist : undefined
  const available = typeof entry.available === 'boolean' ? entry.available : undefined

  const tempoCandidate = entry.tempo ?? entry.bpm ?? entry.tempoBpm
  const tempo = typeof tempoCandidate === 'number' ? tempoCandidate : undefined

  const energyCandidate = entry.energy ?? entry.danceability ?? entry.energyScore
  const energy = typeof energyCandidate === 'number' ? energyCandidate : undefined

  const valenceCandidate = entry.valence ?? entry.mood ?? entry.happiness
  const valence = typeof valenceCandidate === 'number' ? valenceCandidate : undefined

  const album = typeof entry.album === 'string' ? entry.album : undefined

  return {
    trackId,
    title: title ?? trackId,
    artist: artist ?? 'Unknown artist',
    available,
    tempo: tempo ?? null,
    energy: energy ?? null,
    valence: valence ?? null,
    album,
    source: 'api'
  }
}

function fallbackDemoTrack(trackId: string): TrackMetadata | null {
  const demo = getDemoTrackMeta(trackId)
  if (!demo) {
    return null
  }

  return {
    trackId,
    title: demo.title,
    artist: demo.artist,
    available: demo.available,
    tempo: typeof demo.tempo === 'number' ? demo.tempo : null,
    energy: typeof demo.energy === 'number' ? demo.energy : null,
    valence: typeof demo.valence === 'number' ? demo.valence : null,
    album: undefined,
    source: 'demo'
  }
}

export async function getTracks(trackIds: string[]): Promise<TrackMetadata[]> {
  const uniqueIds = Array.from(new Set(trackIds.filter(Boolean)))
  if (!uniqueIds.length) {
    return []
  }

  try {
    const payload = await requestJson<any>('/getTracks', 'POST', { trackIds: uniqueIds })
    const records: TrackMetadata[] = Array.isArray(payload?.tracks)
      ? payload.tracks.map(normaliseTrackMetadata).filter((item: TrackMetadata | null): item is TrackMetadata => item !== null)
      : Array.isArray(payload)
        ? payload.map(normaliseTrackMetadata).filter((item: TrackMetadata | null): item is TrackMetadata => item !== null)
        : []

    const byId = new Map(records.map((record) => [record.trackId, record]))

    for (const id of uniqueIds) {
      if (!byId.has(id)) {
        const fallback = fallbackDemoTrack(id)
        if (fallback) {
          byId.set(id, fallback)
        }
      }
    }

    return Array.from(byId.values())
  } catch (error) {
    console.warn('LibraryCache.getTracks failed; falling back to demo metadata.', error)
    return uniqueIds
      .map(fallbackDemoTrack)
      .filter((item): item is TrackMetadata => item !== null)
  }
}

export interface LibrarySnapshotPayload {
  userId: string
  tracks: Array<Record<string, unknown>>
  likes: Array<Record<string, unknown>>
  plays?: Array<Record<string, unknown>>
  playlists?: Array<Record<string, unknown>>
}

export async function syncLibrary(payload: LibrarySnapshotPayload): Promise<void> {
  await requestJson('/sync', 'POST', payload)
}

export async function ingestLibrary(payload: LibrarySnapshotPayload): Promise<void> {
  await requestJson('/ingest', 'POST', payload)
}

export async function loadDemoSnapshot(): Promise<LibrarySnapshotPayload> {
  const url = new URL('../data/library_sync_payload.json', import.meta.url).href
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to load library snapshot (${response.status})`)
  }
  return response.json()
}
