import { API_BASE_URL } from '../config'

const TRACK_SCORING_BASE_PATHS = ['/api/TrackScoring', '/api/trackscoring', '/api/track-scoring']

async function postJson<T>(methodName: string, body?: object): Promise<T> {
	let lastError: unknown = null
	const endpoint = methodName.startsWith('/') ? methodName : `/${methodName}`

	for (const base of TRACK_SCORING_BASE_PATHS) {
		const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
		const url = `${API_BASE_URL}${normalizedBase}${endpoint}`

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body ?? {})
			})

			if (!response.ok) {
				const text = await response.text()
				throw new Error(text || `TrackScoring request failed (${response.status}) at ${endpoint}`)
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

	throw new Error(`Unable to reach TrackScoring endpoint ${endpoint}`)
}

export interface BootstrapResult {
	ingested?: number
	ensuredWeights?: boolean
}

/**
 * Ingests stats from LibraryCache to bootstrap TrackScoring for a user.
 * This is the first step after syncing a library.
 */
export async function ingestFromLibrary(userId: string): Promise<BootstrapResult> {
	return postJson('ingestFromLibraryCache', { userId })
}

export interface PreviewResult {
	trackIds: string[]
	tracks?: Array<{
		trackId: string
		score: number
		lastPlayedAt: number
	}>
	source?: 'bootstrap' | 'scores' | 'empty'
}

/**
 * Get a preview of tracks recommended for resurfacing.
 */
export async function getPreview(userId: string, size = 50): Promise<PreviewResult> {
	return postJson<PreviewResult>('preview', { userId, size })
}

export interface WeightsUpdate {
	userId: string
	lastPlayedW: number
	likedWhenW: number
	timesSkippedW: number
}

/**
 * Update scoring weights for a user.
 */
export async function updateWeights(weights: WeightsUpdate): Promise<void> {
	await postJson('updateWeights', weights)
}

export async function keepTrack(userId: string, trackId: string): Promise<void> {
	await postJson('keep', { userId, trackId })
}

export async function snoozeTrack(userId: string, trackId: string, until?: number): Promise<void> {
	await postJson('snooze', { userId, trackId, until })
}

// Compute score for a single track
export async function scoreTrack(userId: string, trackId: string): Promise<number | null> {
	try {
		const result = await postJson<{ score?: number }>('score', { userId, trackId })
		return typeof result?.score === 'number' ? result.score : null
	} catch {
		return null
	}
}

// Batch helper: score many tracks with limited concurrency
export async function getScoresForTracks(
	userId: string,
	trackIds: string[],
	concurrency = 8
): Promise<Record<string, number>> {
	const ids = Array.from(new Set(trackIds.filter(Boolean)))
	const result: Record<string, number> = {}
	let i = 0

	async function worker() {
			while (i < ids.length) {
			const idx = i++
				const id = ids[idx]!
				const value = await scoreTrack(userId, id)
			if (typeof value === 'number') {
					result[id] = value
			}
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, ids.length || 1) }, worker)
	await Promise.all(workers)
	return result
}
