import { API_BASE_URL } from '../config'
import { getDemoLikedTrackIds } from '../data/demoLibraryCache'

const LIBRARY_BASE_PATH = '/api/LibraryCache'

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const payload = await response.text()
    throw new Error(payload || `LibraryCache request failed: ${response.status}`)
  }

  const text = await response.text()
  return (text ? (JSON.parse(text) as T) : ({} as T))
}

type LikedResponse =
  | {
      trackIds?: string[]
    }
  | Array<{
      trackIds?: string[]
    }>

export type LikedTracksSource = 'api' | 'offline-demo'

export interface LikedTracksResult {
  trackIds: string[]
  source: LikedTracksSource
}

export async function getLikedTracks(userId: string): Promise<LikedTracksResult> {
  try {
    const data = await postJson<LikedResponse>(`${LIBRARY_BASE_PATH}/_getLiked`, { userId })
    const trackIds = Array.isArray(data)
      ? data.flatMap((entry) => entry.trackIds ?? [])
      : data.trackIds ?? []

    if (trackIds.length) {
      return { trackIds, source: 'api' }
    }
  } catch (err) {
    const fallbackIds = getDemoLikedTrackIds()
    if (fallbackIds.length) {
      console.warn('LibraryCache fallback: serving offline liked tracks snapshot.', err)
      return { trackIds: fallbackIds, source: 'offline-demo' }
    }
    throw err
  }

  const fallbackIds = getDemoLikedTrackIds()
  if (fallbackIds.length) {
    return { trackIds: fallbackIds, source: 'offline-demo' }
  }

  return { trackIds: [], source: 'api' }
}
