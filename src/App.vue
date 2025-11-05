<script setup lang="ts">
import { computed, reactive, ref, onMounted, watch } from 'vue'
import SwipeSession from './components/SwipeSession.vue'
import { API_BASE_URL, DEFAULT_API_ORIGIN } from './config'
import { loadTimeCapsuleTracks, type TimeCapsuleTrack, type TimeCapsuleSource } from './services/timeCapsule'
import {
  getLikedTracks,
  getTracks,
  loadDemoSnapshot,
  syncLibrary,
  type LikedTracksSource,
  type TrackMetadata
} from './services/libraryCache'
import {
  ensureLink,
  startAuth,
  completeAuth,
  listLinks,
  revokeLink,
  syncLibraryFromSpotify,
  type LinkHandle
} from './services/platformLink'
import {
  ingestFromLibrary as ingestTrackScoringFromLibrary,
  type BootstrapResult
} from './services/trackScoring'
import {
  createSnapshot,
  analyzeSnapshot,
  getReport,
  type PlaylistFinding,
  type PlaylistIssueKind
} from './services/playlistHealth'

type Stage = 'connect' | 'hub' | 'swipe' | 'timecapsule' | 'playlist'

interface HeroContent {
  badge: string
  title: string
  copy: string
  primaryLabel: string
  primaryAction: () => void
  secondaryLabel?: string
  secondaryAction?: () => void
}

interface TimeCapsuleSourceMetaState {
  label: string
  detail: string
  variant: 'success' | 'accent' | 'neutral' | 'warning' | 'muted'
}

interface PlaylistIssue {
  trackId: string
  track: string
  note: string
  kind: PlaylistIssueKind
}

const stage = ref<Stage>('connect')
const connected = ref(false)
const connectLoading = ref(false)
const connectError = ref<string | null>(null)
const librarySyncing = ref(false)
const librarySyncError = ref<string | null>(null)
const lastSyncSummary = ref<string | null>(null)

const likedTracksSource = ref<LikedTracksSource | 'unknown'>('unknown')
const likedTracksLoading = ref(false)
const likedTracksError = ref<string | null>(null)

const permissionOptions = reactive([
  {
    id: 'likes',
    label: 'Liked tracks',
    description: 'Access your saved songs to rediscover forgotten favorites.'
  },
  {
    id: 'playlists',
    label: 'Playlists',
    description: 'Check playlists for duplicates and unavailable tracks.'
  },
  {
    id: 'history',
    label: 'Recent plays',
    description: 'Review listening history to identify tracks you haven\'t heard recently.'
  }
])

const enabledPermissions = ref<string[]>(['likes', 'playlists'])

const insights = [
  { label: 'Tracks resurfaced this week', value: '132' },
  { label: 'Playlists tuned', value: '8' },
  { label: 'Stale tracks snoozed', value: '29' }
]

const journeyCards = [
  {
    id: 'timecapsule',
    title: 'Time-Capsule',
    description: 'Find tracks you haven\'t listened to in a while.',
    detail: '8 tracks ready',
    cta: 'Browse tracks',
    stage: 'timecapsule' as Stage
  },
  {
    id: 'swipe',
    title: 'Swipe Sessions',
    description: 'Review resurfaced tracks and decide what to keep.',
    detail: 'Ready to start',
    cta: 'Start session',
    stage: 'swipe' as Stage
  },
  {
    id: 'playlist',
    title: 'Playlist Maintenance',
    description: 'Clean up duplicates and replace unavailable tracks.',
    detail: 'Scan your playlists',
    cta: 'Check playlists',
    stage: 'playlist' as Stage
  }
]

const timeCapsuleQueue = ref<TimeCapsuleTrack[]>([])
const timeCapsuleLoading = ref(false)
const timeCapsuleError = ref<string | null>(null)
const timeCapsuleSource = ref<TimeCapsuleSource>('snapshot')

const ACTIVE_USER_ID = 'demo-user'
const OAUTH_STATE_STORAGE_KEY = 'resurfacer:spotifyAuthState'
const PERMISSIONS_STORAGE_KEY = 'resurfacer:enabledPermissions'
const SPOTIFY_SCOPES = [
	'user-library-read',
	'user-top-read',
	'user-read-recently-played',
	'playlist-read-private',
	'playlist-read-collaborative'
  ]
  const SPOTIFY_REDIRECT_PATH = '/callback'
  const SPOTIFY_REDIRECT_HOST = '127.0.0.1:5173'
  const currentLink = ref<LinkHandle | null>(null)
const playlistFindings = reactive({
	duplicates: [] as PlaylistIssue[],
	unavailable: [] as PlaylistIssue[],
	outliers: [] as PlaylistIssue[]
})
const playlistStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const playlistError = ref<string | null>(null)
const playlistSource = ref<'unknown' | 'api' | 'demo'>('unknown')

const likedTrackIds = ref<string[]>([])

const PLAYLIST_FALLBACK_ISSUES: Readonly<{ duplicates: PlaylistIssue[]; unavailable: PlaylistIssue[]; outliers: PlaylistIssue[] }> = Object.freeze({
  duplicates: [
    {
      trackId: 'demo:duplicate:1',
      track: 'On the Road Again — Willie Nelson',
      note: 'Appears twice in this playlist. Remove the duplicate entry.',
      kind: 'Duplicate'
    },
    {
      trackId: 'demo:duplicate:2',
      track: 'Corazón de México — Luna Norte',
      note: 'Duplicate across multiple playlists. Keep a single copy.',
      kind: 'Duplicate'
    }
  ],
  unavailable: [
    {
      trackId: 'demo:unavailable:1',
      track: 'Desert Skies — Monte Vista',
      note: 'No longer streaming. Swap for an available version.',
      kind: 'Unavailable'
    }
  ],
  outliers: [
    {
      trackId: 'demo:outlier:1',
      track: 'Throat Singing 101 — Resonance Collective',
      note: 'Energy mismatch compared to the rest of this playlist.',
      kind: 'Outlier'
    },
    {
      trackId: 'demo:outlier:2',
      track: 'Rainy Day Lo-Fi — Nimbus Ensemble',
      note: 'Mood mismatch. Consider moving to a chill set.',
      kind: 'Outlier'
    }
  ]
})

type PlaylistFindingsGroup = {
  duplicates: PlaylistIssue[]
  unavailable: PlaylistIssue[]
  outliers: PlaylistIssue[]
}

function applyPlaylistFindings(groups: PlaylistFindingsGroup, source: 'api' | 'demo' | 'unknown' = 'unknown') {
  playlistFindings.duplicates = groups.duplicates.map((item) => ({ ...item }))
  playlistFindings.unavailable = groups.unavailable.map((item) => ({ ...item }))
  playlistFindings.outliers = groups.outliers.map((item) => ({ ...item }))
  playlistSource.value = source
}

function clearPlaylistFindings() {
  applyPlaylistFindings({ duplicates: [], unavailable: [], outliers: [] }, 'unknown')
}

function formatTrackLabel(trackId: string, metadata: Map<string, TrackMetadata>) {
  const meta = metadata.get(trackId)
  if (meta?.title && meta?.artist) {
    return `${meta.title} — ${meta.artist}`
  }
  return trackId
}

function noteForKind(kind: PlaylistIssueKind, idx?: number) {
  const position = typeof idx === 'number' && idx >= 0 ? ` (#${idx + 1})` : ''
  switch (kind) {
    case 'Duplicate':
      return `Duplicate entry${position}. Remove extra copies.`
    case 'Unavailable':
      return `Track unavailable${position}. Replace it with an active version.`
    case 'Outlier':
    default:
      return `Stylistic outlier${position}. Decide if it still fits.`
  }
}

async function buildIssuesFromFindings(findings: PlaylistFinding[]): Promise<PlaylistFindingsGroup> {
  if (!Array.isArray(findings) || !findings.length) {
    return { duplicates: [], unavailable: [], outliers: [] }
  }

  const uniqueIds = Array.from(new Set(findings.map((item) => item.trackId).filter((id): id is string => typeof id === 'string' && id.length > 0)))
  let metadata: TrackMetadata[] = []

  if (uniqueIds.length) {
    try {
      metadata = await getTracks(uniqueIds)
    } catch (error) {
      console.warn('PlaylistHealth: unable to load track metadata, continuing with IDs only.', error)
    }
  }

  const metadataMap = new Map(metadata.map((item) => [item.trackId, item]))
  const groups: PlaylistFindingsGroup = { duplicates: [], unavailable: [], outliers: [] }

  for (const finding of findings) {
    if (!finding?.trackId) continue
    const issue: PlaylistIssue = {
      trackId: finding.trackId,
      track: formatTrackLabel(finding.trackId, metadataMap),
      note: noteForKind(finding.kind, finding.idx),
      kind: finding.kind
    }

    switch (finding.kind) {
      case 'Unavailable':
        groups.unavailable.push(issue)
        break
      case 'Outlier':
        groups.outliers.push(issue)
        break
      case 'Duplicate':
      default:
        groups.duplicates.push(issue)
        break
    }
  }

  return groups
}

function sampleTrackIds(ids: string[], limit: number) {
  if (ids.length <= limit) {
    return [...ids]
  }

  const copy = [...ids]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = temp
  }

  return copy.slice(0, limit)
}

const storyMoments = [
  { time: '08:00', label: 'Connect', description: 'Link your Spotify account to get started.' },
  { time: '08:05', label: 'Browse', description: 'Explore tracks you haven\'t heard in a while.' },
  { time: '08:15', label: 'Decide', description: 'Keep, snooze, or add tracks to a playlist.' },
  { time: '08:35', label: 'Maintain', description: 'Clean up duplicates and broken links.' },
  { time: '08:50', label: 'Enjoy', description: 'Listen to your refreshed playlists.' }
]

const swipeQueue = ref<string[]>([])

const isFlowStage = computed(() => ['swipe', 'timecapsule', 'playlist'].includes(stage.value))

function togglePermission(id: string) {
  if (enabledPermissions.value.includes(id)) {
    enabledPermissions.value = enabledPermissions.value.filter((item) => item !== id)
  } else {
    enabledPermissions.value = [...enabledPermissions.value, id]
  }
}

function goToStage(target: Stage) {
  if (target === 'connect') {
    stage.value = 'connect'
    return
  }

  ensureConnection(target)
}

function goHome() {
  if (!ensureConnection()) return
  stage.value = 'hub'
}

function resetConnectionState() {
  connected.value = false
  currentLink.value = null
  swipeQueue.value = []
  likedTracksSource.value = 'unknown'
  lastSyncSummary.value = null
  librarySyncError.value = null
  connectError.value = null
  timeCapsuleQueue.value = []
  timeCapsuleSource.value = 'snapshot'
  stage.value = 'connect'
}

async function connectAccount() {
  if (connectLoading.value) {
    return
  }

  connectError.value = null
  try {
    connectLoading.value = true
    // Persist permissions before redirect
    sessionStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(enabledPermissions.value))
    
    const redirectUri = `http://${SPOTIFY_REDIRECT_HOST}${SPOTIFY_REDIRECT_PATH}`
    const { authorizeUrl, state } = await startAuth({
      userId: ACTIVE_USER_ID,
      platform: 'spotify',
      scopes: SPOTIFY_SCOPES,
      redirectUri
    })
    const payload = { state, userId: ACTIVE_USER_ID, createdAt: Date.now() }
    sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, JSON.stringify(payload))
    window.location.href = authorizeUrl
  } catch (error) {
    connectError.value = error instanceof Error
      ? error.message
      : 'Unable to start Spotify authorization.'
    connectLoading.value = false
  }
}

async function disconnectAccount() {
  if (connectLoading.value) {
    return
  }

  connectError.value = null
  const linkToRevoke = currentLink.value
  let revokeError: string | null = null
  connectLoading.value = true
  try {
    if (linkToRevoke) {
      await revokeLink(linkToRevoke.linkId)
    }
  } catch (error) {
    revokeError = error instanceof Error ? error.message : 'Unable to revoke Spotify link.'
    console.warn(revokeError)
  } finally {
    connectLoading.value = false
    resetConnectionState()
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    if (revokeError) {
      connectError.value = revokeError
    }
  }
}

function clearOAuthParamsFromLocation() {
  const url = new URL(window.location.href)
  const hash = url.hash
  const finalUrl = hash ? `/${hash}` : '/'
  window.history.replaceState({}, document.title, finalUrl)
}

async function processOAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')
  if (!code && !errorParam) {
    return false
  }

  if (errorParam) {
    const reason = errorParam === 'access_denied'
      ? 'Spotify authorization was cancelled.'
      : `Spotify authorization failed (${errorParam}).`
    connectError.value = reason
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    clearOAuthParamsFromLocation()
    return true
  }

  if (!code || !state) {
    connectError.value = 'Incomplete Spotify authorization response. Please try again.'
    clearOAuthParamsFromLocation()
    return true
  }

  const stored = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY)
  if (!stored) {
    connectError.value = 'Authorization session expired. Please try again.'
    clearOAuthParamsFromLocation()
    return true
  }

  let parsed: { state?: string; userId?: string } | null = null
  try {
    parsed = JSON.parse(stored)
  } catch {
    parsed = null
  }

  if (!parsed?.state || parsed.state !== state) {
    connectError.value = 'Authorization state mismatch. Please try connecting again.'
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    clearOAuthParamsFromLocation()
    return true
  }

  let link: LinkHandle | null = null
  try {
    connectLoading.value = true
    link = await completeAuth({ state, code })
    currentLink.value = link
    connected.value = true
    
    // Restore permissions from storage
    const storedPerms = sessionStorage.getItem(PERMISSIONS_STORAGE_KEY)
    if (storedPerms) {
      try {
        const parsed = JSON.parse(storedPerms)
        if (Array.isArray(parsed)) {
          enabledPermissions.value = parsed
        }
      } catch {
        // ignore parse errors
      }
    }
    
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    await resyncLibrary()
    stage.value = 'hub'
  } catch (error) {
    connectError.value = error instanceof Error
      ? error.message
      : 'Unable to complete Spotify authorization.'
    if (!link) {
      connected.value = false
    }
  } finally {
    connectLoading.value = false
    clearOAuthParamsFromLocation()
  }

  return true
}

async function hydrateExistingLink() {
  try {
    const links = await listLinks(ACTIVE_USER_ID)
    if (!links.length) {
      currentLink.value = null
      connected.value = false
      return
    }
    const match = links.find((entry) => !entry.platform || entry.platform === 'spotify') ?? links[0]!
    currentLink.value = match
    connected.value = true
    if (stage.value === 'connect') {
      stage.value = 'hub'
    }
  } catch (error) {
    console.warn('Unable to load existing platform links.', error)
  }
}

function queueTrackForSwipe(trackId: string) {
  if (!ensureConnection()) return
  if (!swipeQueue.value.includes(trackId)) {
    swipeQueue.value = [...swipeQueue.value, trackId]
  }
  stage.value = 'swipe'
}

function setSwipeQueue(tracks: string[]) {
  swipeQueue.value = tracks
}

function ensureConnection(target?: Stage) {
  if (!connected.value) {
    stage.value = 'connect'
    return false
  }

  if (target) {
    stage.value = target
  }

  return true
}

function describeBootstrap(result?: (BootstrapResult & { syncCounts?: any }) | null) {
  if (!result) {
    return 'Library sync completed.'
  }

  const parts: string[] = []
  
  // Show sync counts if available
  if (result.syncCounts) {
    const { likes, plays, playlists, tracks } = result.syncCounts
    const syncParts: string[] = []
    if (typeof likes === 'number') syncParts.push(`${likes} likes`)
    if (typeof plays === 'number') syncParts.push(`${plays} plays`)
    if (typeof playlists === 'number') syncParts.push(`${playlists} playlists`)
    if (typeof tracks === 'number') syncParts.push(`${tracks} tracks`)
    if (syncParts.length) {
      parts.push(`Synced: ${syncParts.join(', ')}`)
    }
  }
  
  const ingestedCount = result.ingested
  if (typeof ingestedCount === 'number') {
    parts.push(`${ingestedCount} stats ingested`)
  }

  if (result.ensuredWeights) {
    parts.push('weights initialized')
  }

  return parts.length ? parts.join(' · ') : 'Library sync completed.'
}

async function syncLibraryAndScores(userId: string): Promise<BootstrapResult & { syncCounts?: any }> {
  await ensureLink(userId, 'spotify')

  try {
    // Try to fetch fresh data from Spotify first
    try {
      const syncResult = await syncLibraryFromSpotify(userId)
      console.log('Synced from Spotify:', syncResult.counts)
    } catch (syncError) {
      // If sync fails (e.g., duplicate key error), continue with existing cache data
      console.warn('Spotify sync failed, using existing cache data:', syncError)
      if (syncError && typeof syncError === 'object' && 'body' in syncError) {
        console.warn('Sync error details:', (syncError as any).body)
      }
    }
    
    // Then ingest into TrackScoring (will use whatever is in cache)
    const bootstrap = await ingestTrackScoringFromLibrary(userId)
    return { ...bootstrap }
  } catch (error) {
    if (!import.meta.env.DEV) {
      throw error instanceof Error ? error : new Error('Unable to ingest track scores.')
    }

    console.error('Track scoring ingest failed; using demo snapshot fallback.', error)
    if (error && typeof error === 'object' && 'body' in error) {
      console.error('Error body:', (error as any).body)
    }
    const snapshot = await loadDemoSnapshot()
    if (!snapshot.userId || snapshot.userId !== userId) {
      snapshot.userId = userId
    }
    await syncLibrary(snapshot)
    return ingestTrackScoringFromLibrary(userId)
  }
}

async function refreshLikedTracks() {
  likedTracksError.value = null
  likedTracksLoading.value = true

  try {
    const result = await getLikedTracks(ACTIVE_USER_ID)
    likedTracksSource.value = result.source
    if (result.trackIds.length) {
      const unique = Array.from(new Set(result.trackIds))
      swipeQueue.value = unique
      likedTrackIds.value = unique
    } else {
      likedTrackIds.value = []
    }
  } catch (error) {
    likedTracksError.value = error instanceof Error ? error.message : 'Unable to load liked tracks.'
  } finally {
    likedTracksLoading.value = false
  }
}

async function refreshPlaylistHealth() {
  if (playlistStatus.value === 'loading') {
    return
  }

  playlistError.value = null
  playlistStatus.value = 'loading'
  clearPlaylistFindings()

  if (!connected.value) {
    playlistError.value = 'Connect Spotify to analyze playlists.'
    applyPlaylistFindings(PLAYLIST_FALLBACK_ISSUES, 'demo')
    playlistStatus.value = 'error'
    return
  }

  if (!enabledPermissions.value.includes('playlists')) {
    playlistError.value = 'Playlist permission is disabled. Enable it to run analysis.'
    applyPlaylistFindings(PLAYLIST_FALLBACK_ISSUES, 'demo')
    playlistStatus.value = 'error'
    return
  }

  const baseIds = likedTrackIds.value
  if (!baseIds.length) {
    playlistError.value = 'No tracks available to analyze yet. Sync your library first.'
    applyPlaylistFindings(PLAYLIST_FALLBACK_ISSUES, 'demo')
    playlistStatus.value = 'error'
    return
  }

  try {
    const trackIds = sampleTrackIds(baseIds, 200)
    const playlistId = `liked:${ACTIVE_USER_ID}`
    const { snapshotId } = await createSnapshot({ playlistId, userId: ACTIVE_USER_ID, trackIds })
    const { reportId } = await analyzeSnapshot({ playlistId, snapshotId })
    const report = await getReport({ reportId })
    const groups = await buildIssuesFromFindings(Array.isArray(report.findings) ? report.findings : [])
    applyPlaylistFindings(groups, 'api')
    playlistError.value = null
    playlistStatus.value = 'ready'
  } catch (error) {
    console.error('PlaylistHealth analysis failed', error)
    playlistError.value = error instanceof Error ? error.message : 'Unable to analyze playlist.'
    applyPlaylistFindings(PLAYLIST_FALLBACK_ISSUES, 'demo')
    playlistStatus.value = 'error'
  }
}

async function resyncLibrary() {
  librarySyncError.value = null
  librarySyncing.value = true

  try {
    const bootstrap = await syncLibraryAndScores(ACTIVE_USER_ID)
    lastSyncSummary.value = describeBootstrap(bootstrap)
  await refreshLikedTracks()
  await Promise.all([refreshTimeCapsule(), refreshPlaylistHealth()])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sync library.'
    librarySyncError.value = message
    throw error
  } finally {
    librarySyncing.value = false
  }
}

async function handleManualResync() {
  try {
    await resyncLibrary()
  } catch {
    // error already captured in librarySyncError
  }
}

const heroContent = computed<HeroContent>(() => {
  switch (stage.value) {
    case 'connect':
      if (connected.value) {
        return {
          badge: 'Setup',
          title: 'Spotify account connected',
          copy:
            'Your account is linked. You can update permissions below or disconnect anytime.',
          primaryLabel: 'Continue',
          primaryAction: goHome,
          secondaryLabel: 'Disconnect',
          secondaryAction: disconnectAccount
        }
      }

      return {
        badge: 'Setup',
        title: 'Connect your Spotify account',
        copy:
          'Link Spotify to start rediscovering your music. You control what data we can access.',
        primaryLabel: connectLoading.value ? 'Connecting…' : 'Connect account',
        primaryAction: connectAccount
      }
    case 'hub':
      return {
        badge: 'Home',
        title: 'What would you like to do?',
        copy:
          'Choose an option below to rediscover old tracks, review your library, or clean up playlists.',
        primaryLabel: 'Start Swipe Session',
        primaryAction: () => goToStage('swipe'),
        secondaryLabel: 'Browse Time-Capsule',
        secondaryAction: () => goToStage('timecapsule')
      }
    case 'swipe':
      return {
        badge: 'Swipe Sessions',
        title: 'Review your tracks',
        copy:
          'Go through resurfaced tracks and decide what to keep, snooze, or add to a playlist.',
        primaryLabel: 'Back to home',
        primaryAction: goHome
      }
    case 'timecapsule':
      return {
        badge: 'Time-Capsule',
        title: 'Rediscover old favorites',
        copy:
          'Browse tracks you haven\'t listened to recently and decide what to do with them.',
        primaryLabel: 'Back to home',
        primaryAction: goHome
      }
    case 'playlist':
      return {
        badge: 'Playlist Maintenance',
        title: 'Clean up your playlists',
        copy:
          'Find and fix duplicates, unavailable tracks, and other issues in your playlists.',
        primaryLabel: 'Back to home',
        primaryAction: goHome
      }
    default:
      return {
        badge: 'Resurfacer',
        title: 'Resurface the soundtrack',
        copy: 'Choose a flow to keep the music fresh.',
        primaryLabel: 'Back to flow selector',
        primaryAction: goHome
      }
  }
})

const timeCapsuleStats = computed(() => {
  const queue = timeCapsuleQueue.value
  const total = queue.length

  if (!total) {
    return {
      queueSize: 0,
      averageStaleness: 0,
      highStalenessCount: 0,
      spotlightTrack: null,
      uniqueArtists: 0
    }
  }

  const stalenessValues = queue.map((item) => item.stalenessPercent)
  const averageStaleness = Math.round(stalenessValues.reduce((sum, value) => sum + value, 0) / total)
  const highStalenessCount = queue.filter((item) => item.stalenessPercent >= 85).length
  const spotlightTrack = queue[0] ?? null
  const uniqueArtists = new Set(queue.map((item) => item.artist)).size

  return {
    queueSize: total,
    averageStaleness,
    highStalenessCount,
    spotlightTrack,
    uniqueArtists
  }
})

const apiBaseDisplay = computed(() => {
  if (!API_BASE_URL || API_BASE_URL.startsWith('/')) {
    return `${DEFAULT_API_ORIGIN} (proxied)`
  }

  try {
    return new URL(API_BASE_URL, window.location.origin).origin
  } catch (error) {
    console.warn('Unable to parse API base URL', error)
    return API_BASE_URL
  }
})

const playlistHasFindings = computed(
  () =>
    playlistFindings.duplicates.length +
    playlistFindings.unavailable.length +
    playlistFindings.outliers.length >
    0
)

const playlistSourceLabel = computed(() => {
  switch (playlistSource.value) {
    case 'api':
      return 'Analysis from PlaylistHealth'
    case 'demo':
      return 'Sample data (offline)'
    default:
      return ''
  }
})

const timeCapsuleSourceMeta = computed<TimeCapsuleSourceMetaState>(() => {
  switch (timeCapsuleSource.value) {
    case 'api-scores':
      return {
        label: 'Live preview',
        detail: 'Using stored resurfacing scores from TrackScoring.',
        variant: 'success'
      }
    case 'api-bootstrap':
      return {
        label: 'Bootstrapped preview',
        detail: 'Seeded from recent listening stats while scores warm up.',
        variant: 'accent'
      }
    case 'api-unknown':
      return {
        label: 'Live preview',
        detail: 'Preview data returned directly from the TrackScoring service.',
        variant: 'neutral'
      }
    case 'snapshot-empty':
      return {
        label: 'Snapshot fallback',
        detail: 'Live preview returned no tracks yet; showing the snapshot backlog.',
        variant: 'warning'
      }
    case 'snapshot-error':
      return {
        label: 'Snapshot fallback',
        detail: timeCapsuleError.value ?? 'Live preview unavailable; displaying saved snapshot data.',
        variant: 'warning'
      }
    case 'snapshot':
    default:
      return {
        label: 'Snapshot fallback',
        detail: 'Using the saved library snapshot for suggestions.',
        variant: 'muted'
      }
  }
})

const likedTracksSourceLabel = computed(() => {
  switch (likedTracksSource.value) {
    case 'api':
      return 'LibraryCache (live)'
    case 'offline-demo':
      return 'Demo snapshot'
    default:
      return likedTracksLoading.value ? 'Loading…' : 'Not loaded yet'
  }
})

async function refreshTimeCapsule() {
  timeCapsuleError.value = null
  timeCapsuleLoading.value = true

  try {
    const { tracks, source } = await loadTimeCapsuleTracks(ACTIVE_USER_ID, 12)
    timeCapsuleQueue.value = tracks
    timeCapsuleSource.value = source
  } catch (error) {
    timeCapsuleError.value = error instanceof Error ? error.message : 'Unable to load time-capsule data.'
    timeCapsuleSource.value = 'snapshot-error'
    timeCapsuleQueue.value = []
  } finally {
    timeCapsuleLoading.value = false
  }
}

onMounted(async () => {
  // Restore permissions from storage if available
  const storedPerms = sessionStorage.getItem(PERMISSIONS_STORAGE_KEY)
  if (storedPerms) {
    try {
      const parsed = JSON.parse(storedPerms)
      if (Array.isArray(parsed)) {
        enabledPermissions.value = parsed
      }
    } catch {
      // ignore parse errors
    }
  }
  
  const handled = await processOAuthCallback()
  if (!handled) {
    await hydrateExistingLink()
  }

  if (connected.value) {
    if (!timeCapsuleQueue.value.length) {
      await refreshTimeCapsule()
    }
    if (!swipeQueue.value.length) {
      await refreshLikedTracks()
    }
    if (playlistStatus.value === 'idle') {
      await refreshPlaylistHealth()
    }
  }
})

watch(
	() => stage.value,
	(next) => {
		if (next === 'playlist') {
			void refreshPlaylistHealth()
		}
	}
)

watch(
  () => likedTrackIds.value,
  (ids) => {
    if (Array.isArray(ids) && ids.length && stage.value === 'playlist') {
      void refreshPlaylistHealth()
    }
  }
)
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="brand-lockup">
          <span class="brand-word brand-word--animated">Resurfacer</span>
          <span class="brand-tagline">Rediscover your sound</span>
        </div>
      </div>
      <nav class="sidebar__nav">
        <span class="sidebar__section">Journey</span>
        <button
          class="sidebar__link"
          :class="{ 'sidebar__link--active': stage === 'connect' }"
          type="button"
          @click="goToStage('connect')"
        >
          Connect account
        </button>
        <button
          class="sidebar__link"
          :class="{ 'sidebar__link--active': stage === 'hub' }"
          type="button"
          :disabled="!connected"
          @click="goHome"
        >
          Flow selector
        </button>
        <button
          class="sidebar__link"
          :class="{ 'sidebar__link--active': stage === 'swipe' }"
          type="button"
          :disabled="!connected"
          @click="goToStage('swipe')"
        >
          Swipe Sessions
        </button>
        <button
          class="sidebar__link"
          :class="{ 'sidebar__link--active': stage === 'timecapsule' }"
          type="button"
          :disabled="!connected"
          @click="goToStage('timecapsule')"
        >
          Time-Capsule
        </button>
        <button
          class="sidebar__link"
          :class="{ 'sidebar__link--active': stage === 'playlist' }"
          type="button"
          :disabled="!connected"
          @click="goToStage('playlist')"
        >
          Playlist Surgery
        </button>
      </nav>
      <nav class="sidebar__nav">
        <span class="sidebar__section">Library</span>
        <span class="sidebar__ghost">Liked tracks</span>
        <span class="sidebar__ghost">Recently added</span>
        <span class="sidebar__ghost">Archived</span>
      </nav>
      <div class="sidebar__footer">
        <p>Connected to backend at <span class="accent">{{ apiBaseDisplay }}</span></p>
      </div>
    </aside>

    <div :class="['content', { 'content--flow': isFlowStage }]">
  <header :class="['hero', { 'hero--compact': isFlowStage, 'hero--wide': !isFlowStage }]">
        <div class="hero__badge">{{ heroContent.badge }}</div>
        <h1>{{ heroContent.title }}</h1>
        <p>{{ heroContent.copy }}</p>
        <div class="hero__actions">
          <button
            class="hero__cta"
            type="button"
            :disabled="stage === 'connect' && !connected && connectLoading"
            @click="heroContent.primaryAction"
          >
            {{ heroContent.primaryLabel }}
          </button>
          <button
            v-if="heroContent.secondaryLabel && heroContent.secondaryAction"
            class="hero__secondary"
            type="button"
            @click="heroContent.secondaryAction"
          >
            {{ heroContent.secondaryLabel }}
          </button>
        </div>
      </header>

      <section v-if="stage === 'connect'" class="connect-layout">
        <div class="connect-grid-top">
          <article class="connect-prep">
            <h3>Getting started</h3>
            <p>Follow these steps to begin:</p>
            <ul>
              <li>Connect your Spotify account.</li>
              <li>Choose which data you want to share.</li>
              <li>Start exploring your music library.</li>
            </ul>
            <div class="connect-status" role="status">
              <p>
                <strong>Library sync:</strong>
                <span>{{ librarySyncing ? 'Syncing…' : lastSyncSummary ?? 'Not synced yet' }}</span>
              </p>
              <p>
                <strong>Liked tracks:</strong>
                <span>{{ likedTracksSourceLabel }}</span>
              </p>
              <p v-if="likedTracksLoading" class="connect-status__hint">Loading liked tracks…</p>
              <p v-if="likedTracksError" class="connect-error">{{ likedTracksError }}</p>
              <p v-else-if="connectError" class="connect-error">{{ connectError }}</p>
              <p v-else-if="librarySyncError" class="connect-error">{{ librarySyncError }}</p>
            </div>
          </article>
        </div>

        <div class="connect-main-grid">
          <div class="connect-permissions">
            <h2>Select permissions</h2>
            <p>
              Choose what data Resurfacer can access from your Spotify account.
            </p>
            <div class="permission-list">
              <button
                v-for="permission in permissionOptions"
                :key="permission.id"
                type="button"
                class="permission-toggle"
                :class="{ 'permission-toggle--active': enabledPermissions.includes(permission.id) }"
                @click="togglePermission(permission.id)"
              >
                <span class="permission-toggle__indicator" />
                <div class="permission-toggle__copy">
                  <strong>{{ permission.label }}</strong>
                  <p>{{ permission.description }}</p>
                </div>
                <span class="permission-toggle__state">
                  {{ enabledPermissions.includes(permission.id) ? 'Allowed' : 'Blocked' }}
                </span>
              </button>
            </div>
            <div v-if="connected" class="connect-inline-actions">
              <button type="button" :disabled="librarySyncing || connectLoading" @click="handleManualResync">
                {{ librarySyncing ? 'Syncing…' : 'Sync from Spotify & refresh scores' }}
              </button>
              <p class="connect-inline-actions__hint">
                Pulls your latest library and play history from Spotify, then refreshes TrackScoring.
              </p>
            </div>
          </div>

          <section class="story-panel story-panel--connect">
            <header>
              <h2>How it works</h2>
              <p>A typical session with Resurfacer.</p>
            </header>
            <ul>
              <li v-for="moment in storyMoments" :key="moment.time">
                <span class="story-time">{{ moment.time }}</span>
                <div>
                  <strong>{{ moment.label }}</strong>
                  <p>{{ moment.description }}</p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <template v-else-if="stage === 'hub'">
        <section class="journey-grid">
          <article v-for="card in journeyCards" :key="card.id" class="journey-card">
            <h2>{{ card.title }}</h2>
            <p>{{ card.description }}</p>
            <span class="journey-card__detail">{{ card.detail }}</span>
            <button :disabled="!connected" type="button" @click="goToStage(card.stage)">{{ card.cta }}</button>
            <p v-if="!connected" class="journey-card__locked">Connect to unlock this flow.</p>
          </article>
        </section>

        <section class="insights">
          <article v-for="item in insights" :key="item.label" class="insight">
            <span class="insight__value">{{ item.value }}</span>
            <span class="insight__label">{{ item.label }}</span>
          </article>
        </section>

        <section class="ai-preview">
          <div class="ai-preview__header">
            <span class="ai-preview__badge">Coming soon</span>
            <h2>Smart Suggestions</h2>
            <p>
              We're building features to help you discover patterns and maintain your library more easily.
            </p>
          </div>
          <ul class="ai-preview__list">
            <li>
              <strong>Listening insights</strong>
              <p>See what's changed in your listening habits over time.</p>
            </li>
            <li>
              <strong>Playlist health checks</strong>
              <p>Identify duplicates, unavailable tracks, and inconsistencies.</p>
            </li>
            <li>
              <strong>Personalized recommendations</strong>
              <p>Get suggestions based on your listening preferences.</p>
            </li>
          </ul>
        </section>
      </template>

      <template v-else-if="stage === 'swipe'">
        <section class="flow-plan">
          <h2>How it works</h2>
          <p>
            Review tracks from your library one at a time. Keep what you like, snooze tracks to review later, or add them to a playlist.
          </p>
          <ul>
            <li>Load tracks from your liked songs.</li>
            <li>Decide what to do with each track.</li>
            <li>Set how many tracks you want to review.</li>
          </ul>
        </section>
        <SwipeSession class="flow-session" :seed-tracks="swipeQueue" :user-id="ACTIVE_USER_ID" @update:seedTracks="setSwipeQueue" />
      </template>

      <template v-else-if="stage === 'timecapsule'">
        <section class="timecapsule-summary">
          <div class="timecapsule-header">
            <h2>Your old favorites</h2>
            <p>
              Tracks you haven't listened to recently, sorted by how long it's been since you last played them.
            </p>
            <div class="timecapsule-controls" aria-live="polite">
              <div class="timecapsule-source">
                <span :class="['source-pill', `source-pill--${timeCapsuleSourceMeta.variant}`]">
                  {{ timeCapsuleSourceMeta.label }}
                </span>
                <span class="source-detail">{{ timeCapsuleSourceMeta.detail }}</span>
              </div>
              <button
                type="button"
                class="refresh-button"
                :disabled="timeCapsuleLoading"
                @click="refreshTimeCapsule"
              >
                <span v-if="timeCapsuleLoading" class="refresh-button__spinner" aria-hidden="true"></span>
                <span>{{ timeCapsuleLoading ? 'Refreshing…' : 'Refresh' }}</span>
              </button>
            </div>
          </div>

          <div class="timecapsule-overview">
            <article class="timecapsule-stat">
              <span class="timecapsule-stat__label">Total tracks</span>
              <strong class="timecapsule-stat__value">{{ timeCapsuleStats.queueSize }}</strong>
              <p>Tracks ready to rediscover.</p>
            </article>
            <article class="timecapsule-stat">
              <span class="timecapsule-stat__label">Haven't heard</span>
              <strong class="timecapsule-stat__value">{{ timeCapsuleStats.averageStaleness }}%</strong>
              <p>{{ timeCapsuleStats.highStalenessCount }} tracks haven't been played in a long time.</p>
            </article>
            <article class="timecapsule-stat">
              <span class="timecapsule-stat__label">Artists</span>
              <strong class="timecapsule-stat__value">{{ timeCapsuleStats.uniqueArtists }}</strong>
              <p>Different artists in this list.</p>
            </article>
          </div>
        </section>

        <section class="timecapsule-detail">
          <div class="timecapsule-body">
            <div class="timecapsule-table-wrap">
              <header class="timecapsule-table__header">
                <h3>Tracks</h3>
                <p>Add any track to your Swipe Session queue to review it.</p>
              </header>
              <table class="timecapsule-table">
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Artist</th>
                    <th>Last played</th>
                    <th>Staleness</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="timeCapsuleLoading" class="timecapsule-row--loading">
                    <td colspan="5">
                      <span class="loading-message">Loading time-capsule tracks…</span>
                    </td>
                  </tr>
                  <tr v-else-if="timeCapsuleError" class="timecapsule-row--error">
                    <td colspan="5">
                      <span class="error-message">{{ timeCapsuleError }}</span>
                      <button type="button" class="retry-button" @click="refreshTimeCapsule">Try again</button>
                    </td>
                  </tr>
                  <tr v-else-if="!timeCapsuleQueue.length" class="timecapsule-row--empty">
                    <td colspan="5">
                      <span class="empty-message">No tracks to show right now. Check back soon.</span>
                    </td>
                  </tr>
                  <template v-else>
                    <tr v-for="row in timeCapsuleQueue" :key="row.trackId">
                      <td>{{ row.title }}</td>
                      <td>{{ row.artist }}</td>
                      <td>
                        <span :title="row.lastPlayedAbsolute">{{ row.lastPlayedRelative }}</span>
                      </td>
                      <td><span class="pill">{{ row.stalenessPercent }}%</span></td>
                      <td>
                        <button
                          type="button"
                          :disabled="swipeQueue.includes(row.trackId)"
                          @click="queueTrackForSwipe(row.trackId)"
                        >
                          {{ swipeQueue.includes(row.trackId) ? 'Added' : 'Add to queue' }}
                        </button>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <aside class="timecapsule-sidebar">
              <div v-if="timeCapsuleStats.spotlightTrack" class="timecapsule-spotlight">
                <span class="timecapsule-spotlight__badge">Spotlight</span>
                <h3>{{ timeCapsuleStats.spotlightTrack.title }}</h3>
                <p>
                  {{ timeCapsuleStats.spotlightTrack.artist }} · Last played
                  <span :title="timeCapsuleStats.spotlightTrack.lastPlayedAbsolute">
                    {{ timeCapsuleStats.spotlightTrack.lastPlayedRelative }}
                  </span>
                </p>
                <p>
                  This track hasn't been played in a while. Add it to your queue to review.
                </p>
                <button
                  type="button"
                  :disabled="swipeQueue.includes(timeCapsuleStats.spotlightTrack.trackId)"
                  @click="queueTrackForSwipe(timeCapsuleStats.spotlightTrack.trackId)"
                >
                  {{ swipeQueue.includes(timeCapsuleStats.spotlightTrack.trackId) ? 'Added' : 'Add to queue' }}
                </button>
              </div>

                            <div class="timecapsule-guidance">
                <h3>What to do next</h3>
                <ul>
                  <li>Add tracks to your Swipe Session queue to review them.</li>
                  <li>Create a new playlist with your rediscovered favorites.</li>
                  <li>Come back anytime to find more old tracks.</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </template>

      <template v-else-if="stage === 'playlist'">
        <section class="playlist-report">
          <header class="playlist-report__header">
            <div>
              <h2>Playlist issues</h2>
              <p>Review and fix any problems found in your playlists.</p>
            </div>
            <div class="playlist-report__controls">
              <span v-if="playlistSourceLabel" class="playlist-report__badge">{{ playlistSourceLabel }}</span>
              <button :disabled="playlistStatus === 'loading'" type="button" @click="refreshPlaylistHealth">
                {{ playlistStatus === 'loading' ? 'Analyzing…' : 'Rescan' }}
              </button>
            </div>
          </header>

          <div v-if="playlistStatus === 'loading'" class="playlist-report__state">Analyzing playlist…</div>
          <template v-else>
            <div v-if="playlistStatus === 'error'" class="playlist-report__state playlist-report__state--error">
              <p>{{ playlistError ?? 'Unable to analyze playlist.' }}</p>
              <button type="button" class="retry-button" @click="refreshPlaylistHealth">Try again</button>
            </div>
            <div v-if="playlistHasFindings" class="report-columns">
            <div>
              <h3>Duplicates</h3>
              <ul>
                <li v-for="item in playlistFindings.duplicates" :key="item.trackId">
                  <strong>{{ item.track }}</strong>
                  <p>{{ item.note }}</p>
                  <button type="button">Remove duplicate</button>
                </li>
                <li v-if="!playlistFindings.duplicates.length" class="report-empty">No duplicates found.</li>
              </ul>
            </div>
            <div>
              <h3>Unavailable</h3>
              <ul>
                <li v-for="item in playlistFindings.unavailable" :key="item.trackId">
                  <strong>{{ item.track }}</strong>
                  <p>{{ item.note }}</p>
                  <button type="button">Swap source</button>
                </li>
                <li v-if="!playlistFindings.unavailable.length" class="report-empty">All tracks available.</li>
              </ul>
            </div>
            <div>
              <h3>Mood outliers</h3>
              <ul>
                <li v-for="item in playlistFindings.outliers" :key="item.trackId">
                  <strong>{{ item.track }}</strong>
                  <p>{{ item.note }}</p>
                  <button type="button">Tag for review</button>
                </li>
                <li v-if="!playlistFindings.outliers.length" class="report-empty">No mood outliers detected.</li>
              </ul>
            </div>
            </div>
            <div v-else class="playlist-report__state">No issues detected. You're all set!</div>
          </template>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
  background: radial-gradient(circle at 18% 12%, rgba(180, 155, 255, 0.12), transparent 52%),
    radial-gradient(circle at 88% 8%, rgba(29, 185, 84, 0.18), transparent 55%),
    linear-gradient(160deg, rgba(18, 18, 18, 0.96), rgba(10, 10, 10, 0.94));
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem 1.5rem;
  background: linear-gradient(200deg, rgba(10, 10, 10, 0.92), rgba(6, 6, 6, 0.82));
  border-right: 1px solid var(--spotify-border);
  backdrop-filter: blur(18px);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.brand-lockup {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.brand-word {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: linear-gradient(120deg, var(--spotify-green-bright), var(--spotify-mint));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.brand-word--animated {
  position: relative;
  display: inline-block;
}

.brand-word--animated::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0));
  mix-blend-mode: screen;
  animation: brand-glisten 3.2s ease-in-out infinite;
  pointer-events: none;
}

.brand-tagline {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--spotify-text-muted);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar__section {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--spotify-text-muted);
}

.sidebar__link {
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--spotify-text-soft);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.sidebar__link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--spotify-text);
  transform: translateX(4px);
}

.sidebar__link--active {
  background: rgba(29, 185, 84, 0.18);
  color: var(--spotify-green-bright);
  box-shadow: inset 0 0 0 1px rgba(29, 185, 84, 0.25);
}

.sidebar__link:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.sidebar__link:disabled:hover {
  background: transparent;
  color: var(--spotify-text-muted);
}

.sidebar__ghost {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  color: var(--spotify-text-muted);
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
}

.sidebar__footer {
  margin-top: auto;
  font-size: 0.8rem;
  color: var(--spotify-text-muted);
}

.accent {
  color: var(--spotify-green);
}

.content {
  padding: 2.5rem 3rem 3.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.content--flow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: auto auto;
  align-items: stretch;
  gap: 2rem;
}

.hero {
  padding: 2.5rem;
  border-radius: 22px;
  background: radial-gradient(circle at 8% 4%, rgba(180, 155, 255, 0.3), transparent 60%),
    linear-gradient(135deg, rgba(29, 185, 84, 0.96), rgba(12, 12, 12, 0.92));
  color: var(--spotify-text);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  max-width: 760px;
}

.hero--compact {
  width: 100%;
  padding: 2rem;
  height: 100%;
}

.hero--wide {
  width: 100%;
  max-width: none;
  align-self: stretch;
}

.content--flow > .hero {
  grid-column: 2;
  grid-row: 1;
  justify-self: stretch;
  max-width: none;
  width: 100%;
}

.content--flow > .flow-plan,
.content--flow > .timecapsule-summary,
.content--flow > .playlist-report {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  align-self: stretch;
}

.content--flow > .flow-session,
.content--flow > .timecapsule-detail {
  grid-column: 1 / -1;
  grid-row: 2;
  min-width: 0;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 1.2rem 0 0.6rem;
  font-size: 2.75rem;
  font-weight: 700;
}

.hero p {
  margin: 0 0 1.6rem;
  max-width: 46ch;
  color: var(--spotify-text-soft);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.hero__cta,
.hero__secondary {
  padding: 0.75rem 1.6rem;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hero__cta {
  border: none;
  background: var(--spotify-green);
  color: var(--spotify-black);
}

.hero__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(29, 185, 84, 0.35);
}

.hero__secondary {
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: var(--spotify-text);
}

.hero__secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(255, 255, 255, 0.12);
}

.insights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.insight {
  padding: 1.5rem;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(18, 18, 18, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(14px);
}

.insight__value {
  display: block;
  font-size: 1.8rem;
  font-weight: 600;
}

.insight__label {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.connect-layout {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.connect-grid-top {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.connect-prep,
.connect-permissions,
.story-panel--connect {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 30px 50px rgba(0, 0, 0, 0.35);
}

.connect-prep h3 {
  margin-top: 0;
}

.connect-prep p {
  color: rgba(255, 255, 255, 0.62);
  margin-bottom: 1rem;
}

.connect-prep ul {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  color: rgba(255, 255, 255, 0.62);
}

.connect-status {
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
  background: rgba(29, 185, 84, 0.08);
  border: 1px solid rgba(29, 185, 84, 0.22);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.connect-status p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
}

.connect-status__hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.58);
}

.connect-error {
  color: #ff8080;
  font-size: 0.85rem;
}

.connect-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 2rem;
}

.connect-permissions h2,
.connect-permissions p {
  margin-top: 0;
  color: rgba(255, 255, 255, 0.62);
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.permission-toggle {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border-radius: 16px;
  background: rgba(24, 24, 24, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.permission-toggle:hover {
  border-color: rgba(29, 185, 84, 0.35);
  transform: translateY(-2px);
}

.permission-toggle--active {
  border-color: rgba(29, 185, 84, 0.55);
  background: rgba(29, 185, 84, 0.15);
}

.permission-toggle__indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
}

.permission-toggle--active .permission-toggle__indicator {
  background: var(--spotify-green);
  box-shadow: 0 0 12px rgba(29, 185, 84, 0.6);
}

.permission-toggle__copy strong {
  display: block;
  margin-bottom: 0.3rem;
}

.permission-toggle__copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
}

.permission-toggle__state {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.connect-inline-actions {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.connect-inline-actions button {
  align-self: flex-start;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--spotify-green), var(--spotify-green-bright));
  color: var(--spotify-black);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.connect-inline-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.connect-inline-actions button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(29, 185, 84, 0.3);
}

.connect-inline-actions__hint {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.6);
}

.journey-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.journey-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.8rem;
  border-radius: 20px;
  background: var(--spotify-charcoal);
  border: 1px solid var(--spotify-border);
  box-shadow: 0 22px 36px rgba(0, 0, 0, 0.28);
}

.journey-card h2 {
  margin: 0;
  font-size: 1.3rem;
}

.journey-card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.65);
}

.journey-card__detail {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
}

.journey-card button {
  align-self: flex-start;
  padding: 0.65rem 1.4rem;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--spotify-green), var(--spotify-green-bright));
  color: var(--spotify-black);
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.journey-card button:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(29, 185, 84, 0.3);
}

.journey-card button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.journey-card__locked {
  margin: 0;
  font-size: 0.8rem;
  color: var(--spotify-text-muted);
}

.ai-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 44px rgba(0, 0, 0, 0.32);
}

.ai-preview__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ai-preview__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  background: rgba(180, 155, 255, 0.2);
  color: rgba(180, 155, 255, 0.92);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ai-preview__header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.62);
}

.ai-preview__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ai-preview__list li {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 1rem;
}

.ai-preview__list strong {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 1rem;
}

.ai-preview__list p {
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
}

@keyframes brand-glisten {
  0% {
    transform: translateX(-120%) rotate(10deg);
    opacity: 0;
  }
  20% {
    opacity: 0.85;
  }
  50% {
    transform: translateX(120%) rotate(10deg);
    opacity: 0;
  }
  100% {
    transform: translateX(120%) rotate(10deg);
    opacity: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.story-panel {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 28px 44px rgba(0, 0, 0, 0.3);
}

.story-panel header h2 {
  margin: 0 0 0.4rem;
}

.story-panel header p {
  margin: 0 0 1.2rem;
  color: rgba(255, 255, 255, 0.62);
}

.story-panel ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.story-panel li {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 1rem;
  align-items: baseline;
}

.story-time {
  font-size: 0.9rem;
  color: rgba(29, 185, 84, 0.9);
  font-weight: 600;
}

.flow-plan {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 42px rgba(0, 0, 0, 0.32);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  height: 100%;
}
.flow-plan h2 {
  margin-top: 0;
}
.flow-plan p {
  color: rgba(255, 255, 255, 0.68);
}
.flow-plan ul {
  margin: 1.2rem 0 0;
  padding-left: 1.2rem;
  color: rgba(255, 255, 255, 0.65);
}
.flow-plan li {
  margin-bottom: 0.6rem;
}

.timecapsule-summary,
.timecapsule-detail {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 44px rgba(0, 0, 0, 0.32);
}

.timecapsule-summary {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  height: 100%;
}

.timecapsule-detail {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.timecapsule-header p {
  margin: 0.75rem 0 0;
  max-width: 56ch;
  color: rgba(255, 255, 255, 0.62);
}

.timecapsule-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.timecapsule-source {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.source-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.source-pill--success {
  background: rgba(29, 185, 84, 0.18);
  border-color: rgba(29, 185, 84, 0.35);
  color: var(--spotify-green-bright);
}

.source-pill--accent {
  background: rgba(180, 155, 255, 0.18);
  border-color: rgba(180, 155, 255, 0.35);
  color: rgba(180, 155, 255, 0.94);
}

.source-pill--neutral {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--spotify-text);
}

.source-pill--warning {
  background: rgba(255, 214, 102, 0.18);
  border-color: rgba(255, 214, 102, 0.28);
  color: #ffd666;
}

.source-pill--muted {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  color: var(--spotify-text-muted);
}

.source-detail {
  font-size: 0.82rem;
  color: var(--spotify-text-muted);
  max-width: 360px;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--spotify-text);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.refresh-button:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
}

.refresh-button__spinner {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.38);
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

.timecapsule-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}

.timecapsule-stat {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.3rem;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(12, 12, 12, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.timecapsule-stat__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}

.timecapsule-stat__value {
  font-size: 1.4rem;
  font-weight: 600;
}

.timecapsule-stat p {
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
}

.timecapsule-body {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1.2fr);
  gap: 2rem;
}

.timecapsule-table-wrap {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timecapsule-table__header p {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.55);
}

.timecapsule-table {
  width: 100%;
  border-collapse: collapse;
}

.timecapsule-table th,
.timecapsule-table td {
  padding: 0.85rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.timecapsule-table button {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: none;
  background: rgba(29, 185, 84, 0.18);
  color: var(--spotify-green-bright);
  cursor: pointer;
  transition: background 0.2s ease;
}

.timecapsule-table button:disabled {
  opacity: 0.55;
  cursor: default;
  background: rgba(255, 255, 255, 0.08);
  color: var(--spotify-text-muted);
}

.timecapsule-table button:not(:disabled):hover {
  background: rgba(29, 185, 84, 0.24);
}

.timecapsule-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.timecapsule-spotlight {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1.6rem;
  border-radius: 18px;
  background: radial-gradient(circle at 12% 10%, rgba(29, 185, 84, 0.25), rgba(12, 12, 12, 0.9));
  border: 1px solid rgba(29, 185, 84, 0.3);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.32);
}

.timecapsule-spotlight__badge {
  align-self: flex-start;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  color: var(--spotify-green-bright);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.timecapsule-spotlight button {
  align-self: flex-start;
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  border: none;
  background: rgba(29, 185, 84, 0.22);
  color: var(--spotify-green-bright);
  cursor: pointer;
  transition: background 0.2s ease;
}

.timecapsule-spotlight button:not(:disabled):hover {
  background: rgba(29, 185, 84, 0.3);
}

.timecapsule-guidance {
  padding: 1.6rem;
  border-radius: 18px;
  background: rgba(24, 24, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.timecapsule-guidance h3 {
  margin: 0 0 0.75rem;
}

.timecapsule-guidance ul {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  color: rgba(255, 255, 255, 0.58);
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  color: var(--spotify-green-bright);
}

.playlist-report {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 44px rgba(0, 0, 0, 0.32);
}

.playlist-report h2 {
  margin-top: 0;
}

.playlist-report__header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.playlist-report__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.playlist-report__controls button {
  padding: 0.5rem 1.2rem;
  border-radius: 999px;
  border: none;
  background: rgba(29, 185, 84, 0.22);
  color: var(--spotify-green-bright);
  cursor: pointer;
}

.playlist-report__controls button:disabled {
  opacity: 0.6;
  cursor: default;
}

.playlist-report__controls button:not(:disabled):hover {
  background: rgba(29, 185, 84, 0.3);
}

.playlist-report__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.playlist-report__state {
  margin-top: 1.5rem;
  padding: 1.2rem;
  border-radius: 16px;
  background: rgba(24, 24, 24, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.playlist-report__state--error {
  border-color: rgba(255, 99, 71, 0.35);
  color: rgba(255, 186, 163, 0.95);
}

.retry-button {
  padding: 0.5rem 1.3rem;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.playlist-report__state--error .retry-button {
  margin-top: 0.9rem;
}

.report-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.report-columns ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-columns li {
  padding: 1rem;
  border-radius: 16px;
  background: rgba(24, 24, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.report-columns p {
  margin: 0.35rem 0 0.75rem;
  color: rgba(255, 255, 255, 0.55);
}

.report-columns button {
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  border: none;
  background: rgba(29, 185, 84, 0.22);
  color: var(--spotify-green-bright);
  cursor: pointer;
}

.report-columns button:hover {
  background: rgba(29, 185, 84, 0.3);
}

.report-empty {
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: rgba(24, 24, 24, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
}

@media (max-width: 1080px) {
  .app-shell {
    grid-template-columns: 220px 1fr;
  }

  .content {
    padding: 2rem;
  }

  .content--flow {
    display: flex;
    flex-direction: column;
  }

  .connect-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 880px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: sticky;
    top: 0;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(14px);
    padding: 1.25rem;
  }

  .sidebar__nav {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }

  .sidebar__link {
    white-space: nowrap;
  }

  .sidebar__ghost,
  .sidebar__footer {
    display: none;
  }

  .content {
    padding: 1.75rem;
  }

  .content--flow {
    gap: 1.75rem;
  }

  .hero--compact {
    width: 100%;
  }

  .connect-main-grid {
    gap: 1.5rem;
  }

  .timecapsule-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .content {
    padding: 1.5rem;
  }

  .hero {
    padding: 1.75rem;
  }

  .hero h1 {
    font-size: 2.1rem;
  }
}
</style>
