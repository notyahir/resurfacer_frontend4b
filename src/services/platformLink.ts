import { API_BASE_URL } from '../config'
import { getSessionCredentials, isAuthError, handleAuthError } from './session'

const PLATFORM_BASE_PATHS = [
	'/api/PlatformLink',
	'/api/platformlink',
	'/api/Platformlink',
	'/api/platformLink'
]

export class PlatformLinkRequestError extends Error {
	readonly status?: number
	readonly body?: string

	constructor(message: string, status?: number, body?: string) {
		super(message)
		this.name = 'PlatformLinkRequestError'
		this.status = status
		this.body = body
	}
}

export interface LinkHandle {
	linkId: string
	userId?: string
	platform?: string
	tokenExpiration?: number
	scopes?: string[]
}

export interface AuthStartParams {
	userId: string
	platform: string
	scopes: string[]
	redirectUri: string
}

export interface AuthStartResponse {
	authorizeUrl: string
	state: string
	expiresAt?: number
}

export interface AuthCompleteParams {
	state: string
	code: string
}

async function postJson<T>(methodName: string, body?: object, skipAuth = false): Promise<T> {
	let lastError: unknown = null
	const endpoint = methodName.startsWith('/') ? methodName : `/${methodName}`

	const requestBody = skipAuth ? (body ?? {}) : { ...getSessionCredentials(), ...(body ?? {}) }

	for (const base of PLATFORM_BASE_PATHS) {
		const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
		const url = `${API_BASE_URL}${normalizedBase}${endpoint}`

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			})

			const text = await response.text()
			if (!response.ok) {
				const error = new PlatformLinkRequestError(
					`PlatformLink request failed (${response.status}) at ${endpoint}`,
					response.status,
					text
				)
				
				if (isAuthError(error)) {
					handleAuthError(error)
				}
				
				throw error
			}

			if (!text) {
				return {} as T
			}

			const contentType = response.headers.get('content-type') ?? ''
			const trimmed = text.trim()
			if (contentType.includes('application/json') || /^[{\[]/.test(trimmed)) {
				try {
					return JSON.parse(trimmed) as T
				} catch (error) {
					throw new PlatformLinkRequestError(
						`Unable to parse JSON response from ${endpoint}`,
						response.status,
						text
					)
				}
			}

			throw new PlatformLinkRequestError(
				`Unexpected response type for ${endpoint} (${contentType || 'unknown'})`,
				response.status,
				text
			)
		} catch (error) {
			if (error instanceof PlatformLinkRequestError) {
				if (error.status && error.status !== 404) {
					throw error
				}
			}
			lastError = error
		}
	}

	if (lastError instanceof Error) {
		throw lastError
	}

	throw new PlatformLinkRequestError(`Unable to reach PlatformLink endpoint ${endpoint}`)
}

export async function startAuth(params: AuthStartParams): Promise<AuthStartResponse> {
	return postJson<AuthStartResponse>('startAuth', params)
}

export async function completeAuth(params: AuthCompleteParams): Promise<LinkHandle> {
	const payload = await postJson<any>('completeAuth', params, true)
	const linkId: string | undefined = payload?.linkId ?? payload?.id ?? payload?.link?.id
	if (!linkId) {
		throw new Error('PlatformLink.completeAuth did not return a linkId')
	}
	const userId: string | undefined = payload?.userId ?? payload?.user?.id ?? payload?.ownerId
	const tokenExpiration = typeof payload?.tokenExpiration === 'number'
		? payload.tokenExpiration
		: typeof payload?.newExpiration === 'number'
			? payload.newExpiration
			: undefined
	const scopes = Array.isArray(payload?.scopes) ? payload.scopes : undefined
	return { linkId, userId, platform: payload?.platform, tokenExpiration, scopes }
}

function normalizeLinkResponse(payload: any): LinkHandle[] {
	const entries: any[] = Array.isArray(payload?.links)
		? payload.links
		: Array.isArray(payload)
			? payload
			: []

	return entries
		.map((entry) => {
			if (typeof entry === 'string') {
				return { linkId: entry }
			}
			if (entry && typeof entry === 'object') {
				const linkId: string | undefined = entry.linkId ?? entry.id
				if (linkId) {
					const tokenExpiration = typeof entry.tokenExpiration === 'number'
						? entry.tokenExpiration
						: typeof entry.expiration === 'number'
							? entry.expiration
							: typeof entry.token_expiration === 'number'
								? entry.token_expiration
								: undefined
					const scopes = Array.isArray(entry.scopes) ? entry.scopes : undefined
					return { linkId, platform: entry.platform, tokenExpiration, scopes }
				}
			}
			return null
		})
		.filter((entry): entry is LinkHandle => entry !== null && !!entry.linkId)
}

export async function listLinks(userId: string): Promise<LinkHandle[]> {
	const payload = await postJson<any>('listLinks', { userId })
	return normalizeLinkResponse(payload)
}

export async function refreshLink(linkId: string): Promise<number | undefined> {
	const payload = await postJson<any>('refresh', { linkId })
	if (typeof payload?.newExpiration === 'number') {
		return payload.newExpiration
	}
	if (typeof payload?.tokenExpiration === 'number') {
		return payload.tokenExpiration
	}
	return undefined
}

export async function ensureLink(userId: string, platform: string): Promise<LinkHandle> {
	const links = await listLinks(userId)
	if (!links.length) {
		throw new Error(`No linked ${platform} account found for user ${userId}`)
	}
	const match =
		links.find((entry) => !entry.platform || entry.platform === platform) ?? links[0]!
	const now = Date.now()
	if (typeof match.tokenExpiration === 'number' && match.tokenExpiration <= now) {
		const newExpiration = await refreshLink(match.linkId)
		return { ...match, tokenExpiration: newExpiration ?? match.tokenExpiration }
	}
	return match
}

export async function revokeLink(linkId: string): Promise<void> {
	await postJson<void>('revoke', { linkId })
}

export interface SyncLibraryResponse {
	synced: boolean
	counts?: {
		tracks?: number
		likes?: number
		plays?: number
		playlists?: number
	}
}

export async function syncLibraryFromSpotify(userId: string): Promise<SyncLibraryResponse> {
	return postJson<SyncLibraryResponse>('syncLibraryFromSpotify', { userId })
}
