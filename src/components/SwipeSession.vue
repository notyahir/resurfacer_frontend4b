<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  startSession,
  fetchNext,
  decideKeep,
  decideSnooze,
  decideAddToPlaylist,
  endSession,
  type SessionMode
} from '../services/swipeSessions'
import { getLikedTracks, getTracks, type LikedTracksSource, type TrackMetadata } from '../services/libraryCache'
import { getDemoTrackMeta, getDemoLikeEntry } from '../data/demoLibraryCache'
import { getPreview, ingestFromLibrary } from '../services/trackScoring'
import SpotifyPreview from './SpotifyPreview.vue'

const props = defineProps<{ seedTracks: string[]; userId?: string }>()
const emit = defineEmits<{ 'update:seedTracks': [tracks: string[]] }>()

const DEFAULT_SIZE = 30
const DEFAULT_USER_ID = 'demo-user'

interface DecisionRecord {
  trackId: string
  action: 'keep' | 'snooze' | 'add-to-playlist' | 'skip'
  note?: string
  timestamp: number
}

const form = reactive({
  userId: props.userId || DEFAULT_USER_ID,
  size: DEFAULT_SIZE,
  playlistId: '',
  queueText: ''
})

// Auto-update userId when prop changes
watch(() => props.userId, (newUserId) => {
  if (newUserId && newUserId !== form.userId) {
    form.userId = newUserId
  }
}, { immediate: true })

const sessionId = ref<string | null>(null)
const starting = ref(false)
const loading = ref(false)
const sessionComplete = ref(false)
const currentTrack = ref<string | null>(null)
const error = ref<string | null>(null)
const sessionMode = ref<SessionMode | null>(null)
const statusNotice = ref<string | null>(null)
const decisionLog = ref<DecisionRecord[]>([])
const startedAt = ref<number | null>(null)
const likesLoading = ref(false)
const likesError = ref<string | null>(null)
const likesPulledCount = ref<number | null>(null)
const likesSource = ref<LikedTracksSource | null>(null)
const likesPreview = ref<string[]>([])

// Holds preview metadata (score, lastPlayed) keyed by trackId for the current queue
const previewIndex = ref<Record<string, { score?: number; lastPlayedAt?: number }>>({})

type CachedTrackMetadata = TrackMetadata & { source: 'api' | 'demo' }

const trackMetadata = ref<Record<string, CachedTrackMetadata>>({})
let metadataRequestId = 0
let previewRequestId = 0

const durationOptions = [
  { label: 'Later today', value: 6 * 60 * 60 * 1000 },
  { label: 'Tomorrow', value: 24 * 60 * 60 * 1000 },
  { label: 'One week', value: 7 * 24 * 60 * 60 * 1000 }
]

const sessionActive = computed(() => !!sessionId.value && !sessionComplete.value)

const sessionElapsedMinutes = computed(() => {
  if (!startedAt.value) return 0
  return Math.round((Date.now() - startedAt.value) / 60000)
})

function buildDemoMetadata(trackId: string): CachedTrackMetadata | null {
  const demo = getDemoTrackMeta(trackId)
  if (!demo) return null
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

function cacheMetadata(records: TrackMetadata[], sourceOverride?: 'api' | 'demo') {
  if (!records.length) return
  const next = { ...trackMetadata.value }
  for (const record of records) {
    if (!record.trackId) continue
    const source = sourceOverride ?? (record.source === 'api' ? 'api' : 'demo')
    next[record.trackId] = {
      trackId: record.trackId,
      title: record.title ?? record.trackId,
      artist: record.artist ?? 'Unknown artist',
      available: record.available,
      tempo: typeof record.tempo === 'number' ? record.tempo : null,
      energy: typeof record.energy === 'number' ? record.energy : null,
      valence: typeof record.valence === 'number' ? record.valence : null,
      album: record.album,
      source
    }
  }
  trackMetadata.value = next
}

async function ensureMetadata(trackIds: string[]) {
  const uniqueIds = Array.from(new Set(trackIds.filter(Boolean)))
  if (!uniqueIds.length) return

  const missing = uniqueIds.filter((id) => {
    const cached = trackMetadata.value[id]
    if (!cached) return true
    if (cached.source !== 'api') return true
    const hasAudioFeatures = typeof cached.tempo === 'number' && typeof cached.energy === 'number' && typeof cached.valence === 'number'
    return !hasAudioFeatures
  })

  if (!missing.length) {
    return
  }

  const requestId = ++metadataRequestId

  try {
    const records = await getTracks(missing)
    if (requestId !== metadataRequestId) return
    cacheMetadata(records, 'api')
  } catch (error) {
    if (requestId !== metadataRequestId) return
    const fallbacks = missing
      .map(buildDemoMetadata)
      .filter((item): item is CachedTrackMetadata => item !== null)
    cacheMetadata(fallbacks, 'demo')
  }
}

// Ensure resurfacing scores/lastPlayed for the provided queue using TrackScoring.preview.
// This works even when the queue was pre-seeded from outside (not via loadMixedQueue).
async function ensurePreviewForQueue(trackIds: string[]) {
  const uniqueIds = Array.from(new Set(trackIds.filter(Boolean)))
  if (!uniqueIds.length || !form.userId?.trim()) return

  // Only fetch if there are tracks missing in the index
  const missing = uniqueIds.filter((id) => !previewIndex.value[id])
  if (!missing.length) return

  const requestId = ++previewRequestId
  try {
    // Best-effort ingest to ensure scores exist
    try {
      await ingestFromLibrary(form.userId.trim())
    } catch {
      // ignore; continue with preview either way
    }

    const size = Math.max(uniqueIds.length, 50)
    const preview = await getPreview(form.userId.trim(), size)

    if (requestId !== previewRequestId) return

    const index: Record<string, { score?: number; lastPlayedAt?: number }> = { ...previewIndex.value }

    // Prefer detailed response (.tracks); fall back to trackIds-only
    if (Array.isArray((preview as any).tracks)) {
      for (const t of (preview as any).tracks) {
        if (t && typeof t.trackId === 'string') {
          index[t.trackId] = {
            score: typeof t.score === 'number' ? t.score : undefined,
            lastPlayedAt: typeof t.lastPlayedAt === 'number' ? t.lastPlayedAt : undefined
          }
        }
      }
    } else if (Array.isArray(preview.trackIds)) {
      for (const id of preview.trackIds) {
        if (typeof id === 'string' && !(id in index)) {
          index[id] = {}
        }
      }
    }

    previewIndex.value = index
  } catch {
    // Silent failure; scores are optional for UI rendering
  }
}

function describeTracks(trackIds: string[], limit = 5): string[] {
  return trackIds.slice(0, limit).map((trackId) => {
    const meta = trackMetadata.value[trackId] ?? buildDemoMetadata(trackId)
    if (!meta) return trackId
    return `${meta.title} — ${meta.artist}`
  })
}

const currentTrackMeta = computed(() => {
  if (!currentTrack.value) return null
  return trackMetadata.value[currentTrack.value] ?? buildDemoMetadata(currentTrack.value)
})

const currentTrackTitle = computed(
  () => currentTrackMeta.value?.title ?? spotifyEmbedMeta.title ?? currentTrack.value ?? ''
)

const currentTrackArtist = computed(() => currentTrackMeta.value?.artist ?? spotifyEmbedMeta.author ?? '')

const trackInitials = computed(() => {
  const titleSource = currentTrackTitle.value.trim()
  if (!titleSource) return ''

  const initials = titleSource
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || titleSource.slice(0, 2).toUpperCase()
})

function toPercent(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }
  if (value > 1) {
    return Math.round(value)
  }
  return Math.round(value * 100)
}

const trackStats = computed(() => {
  const meta = currentTrackMeta.value
  if (!meta) return null

  const tempo = typeof meta.tempo === 'number' && !Number.isNaN(meta.tempo) ? Math.round(meta.tempo) : null
  const energy = toPercent(meta.energy)
  const valence = toPercent(meta.valence)
  const available = typeof meta.available === 'boolean' ? meta.available : null

  if (tempo === null && energy === null && valence === null && available === null) {
    return null
  }

  return {
    tempo,
    energy,
    valence,
    available
  }
})

// Score and last played from TrackScoring preview (when available)
const currentPreviewEntry = computed(() => (currentTrack.value ? previewIndex.value[currentTrack.value] : undefined))

const currentScore = computed(() =>
  typeof currentPreviewEntry.value?.score === 'number' ? Math.round(currentPreviewEntry.value.score) : null
)

function toMs(ts?: number) {
  if (typeof ts !== 'number' || Number.isNaN(ts)) return undefined
  return ts > 1_000_000_000_000 ? ts : ts * 1000
}

const currentLastPlayed = computed(() => {
  const ms = toMs(currentPreviewEntry.value?.lastPlayedAt)
  if (!ms) return null
  const d = new Date(ms)
  return {
    absolute: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    relative: formatRelativeToNow(d)
  }
})

function normalizeSpotifyTrackId(raw?: string | null) {
  if (!raw) return null
  const match = raw.match(/(?:spotify:track:)?([0-9A-Za-z]{22})/)
  return match ? match[1] : null
}

const spotifyPreviewTrackId = computed(() => {
  const candidates = [currentTrack.value, currentTrackMeta.value?.trackId]
  for (const candidate of candidates) {
    const normalized = normalizeSpotifyTrackId(candidate)
    if (normalized) {
      return normalized
    }
  }
  return null
})

const spotifyEmbedMeta = reactive({
  thumbnailUrl: '',
  title: '',
  author: ''
})

const embedLoading = ref(false)
let embedRequestId = 0

const currentLikeEntry = computed(() => (currentTrack.value ? getDemoLikeEntry(currentTrack.value) : null))

const trackAddedAt = computed(() => {
  const entry = currentLikeEntry.value
  if (!entry) return null

  const date = new Date(entry.addedAt * 1000)
  return {
    absolute: date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    relative: formatRelativeToNow(date)
  }
})

function formatRelativeToNow(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const diffSeconds = Math.round(diffMs / 1000)

  if (diffSeconds < 45) return 'moments ago'
  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  const diffMonths = Math.round(diffDays / 30)
  if (diffMonths < 18) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`

  const diffYears = Math.round(diffDays / 365)
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
}

watch(
  spotifyPreviewTrackId,
  async (trackId) => {
    const requestId = ++embedRequestId
    spotifyEmbedMeta.thumbnailUrl = ''
    spotifyEmbedMeta.title = ''
    spotifyEmbedMeta.author = ''

    if (!trackId) {
      embedLoading.value = false
      return
    }

    if (typeof window === 'undefined') {
      embedLoading.value = false
      return
    }

    embedLoading.value = true

    try {
      const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(
        `https://open.spotify.com/track/${trackId}`
      )}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Spotify oEmbed responded with ${response.status}`)
      }

      const payload = await response.json()

      if (requestId !== embedRequestId) {
        return
      }

      spotifyEmbedMeta.thumbnailUrl = typeof payload.thumbnail_url === 'string' ? payload.thumbnail_url : ''
      spotifyEmbedMeta.title = typeof payload.title === 'string' ? payload.title : ''
      spotifyEmbedMeta.author = typeof payload.author_name === 'string' ? payload.author_name : ''
    } catch (err) {
      if (requestId === embedRequestId) {
        console.warn('Unable to load Spotify embed metadata', err)
      }
    } finally {
      if (requestId === embedRequestId) {
        embedLoading.value = false
      }
    }
  },
  { immediate: true }
)

const parsedQueueTracks = computed(() =>
  form.queueText
    .split('\n')
    .map((track) => track.trim())
    .filter(Boolean)
)

const queueCount = computed(() => parsedQueueTracks.value.length)

const requestedSize = computed(() => (Number.isFinite(form.size) && form.size > 0 ? form.size : 0))

watch(
  () => props.seedTracks,
  (tracks) => {
    const joined = tracks.join('\n')
    if (joined !== form.queueText) {
      form.queueText = joined
    }
  },
  { immediate: true }
)

watch(parsedQueueTracks, (tracks) => {
  if (JSON.stringify(tracks) !== JSON.stringify(props.seedTracks)) {
    emit('update:seedTracks', tracks)
  }
})

watch(parsedQueueTracks, (tracks) => {
  void ensureMetadata(tracks)
  void ensurePreviewForQueue(tracks)
}, { immediate: true })

watch(currentTrack, (trackId) => {
  if (trackId) {
    void ensureMetadata([trackId])
    void ensurePreviewForQueue([trackId])
  }
})

async function loadAndRankTracks() {
  likesError.value = null
  likesPulledCount.value = null
  likesPreview.value = []

  const trimmedUserId = form.userId.trim()
  if (!trimmedUserId) {
    likesError.value = 'Enter a user ID to load tracks.'
    return
  }

  likesLoading.value = true
  try {
    // Step 1: Ensure scores exist by triggering ingest
    try {
      await ingestFromLibrary(trimmedUserId)
    } catch (ingestErr) {
      console.warn('TrackScoring ingest may have failed; continuing with preview.', ingestErr)
    }

    const preferredSize = requestedSize.value || DEFAULT_SIZE

    // Step 2: Fetch top-scored tracks
    const preview = await getPreview(trimmedUserId, preferredSize)

    const trackIds = Array.isArray(preview.trackIds) && preview.trackIds.length
      ? preview.trackIds
      : Array.isArray((preview as any).tracks)
        ? (preview as any).tracks.map((t: any) => t.trackId).filter((x: any) => typeof x === 'string')
        : []

    // Build index for per-track score/lastPlayed
    const index: Record<string, { score?: number; lastPlayedAt?: number }> = {}
    if (Array.isArray((preview as any).tracks)) {
      for (const t of (preview as any).tracks) {
        if (t && typeof t.trackId === 'string') {
          index[t.trackId] = { score: typeof t.score === 'number' ? t.score : undefined, lastPlayedAt: t.lastPlayedAt }
        }
      }
    }

    // Step 3: If preview didn't return enough, supplement with liked tracks
    let finalTracks = trackIds.slice(0, preferredSize)
    
    if (finalTracks.length < preferredSize) {
      const likedResult = await getLikedTracks(trimmedUserId)
      likesSource.value = likedResult.source
      const existingSet = new Set(finalTracks)
      const additional = likedResult.trackIds
        .filter(id => !existingSet.has(id))
        .slice(0, preferredSize - finalTracks.length)
      finalTracks = [...finalTracks, ...additional]
    }

    await ensureMetadata(finalTracks)

    form.queueText = finalTracks.join('\n')
    likesPulledCount.value = finalTracks.length
    previewIndex.value = index
    likesPreview.value = describeTracks(finalTracks)

    if (form.size > finalTracks.length) {
      form.size = finalTracks.length
    }
  } catch (err) {
    likesError.value = err instanceof Error ? err.message : 'Unable to load tracks.'
  } finally {
    likesLoading.value = false
  }
}
function applySessionMode(mode?: unknown) {
  if (mode !== 'offline' && mode !== 'shadow') return
  sessionMode.value = mode
  if (mode === 'offline') {
    statusNotice.value = 'Connection to the swipe service dropped. Showing demo tracks so you can keep reviewing.'
  } else {
    statusNotice.value = null
  }
}

async function startNewSession() {
  error.value = null
  sessionComplete.value = false
  currentTrack.value = null
  decisionLog.value = []
  loading.value = false
  sessionMode.value = null
  statusNotice.value = null

  try {
    starting.value = true
    const queueTracks = parsedQueueTracks.value
    const requestedSize = Number.isFinite(form.size) && form.size > 0 ? form.size : undefined
    const effectiveSize = queueTracks.length
      ? (requestedSize ? Math.min(requestedSize, queueTracks.length) : queueTracks.length)
      : requestedSize

    if (effectiveSize && effectiveSize !== form.size) {
      form.size = effectiveSize
    }

    const result = await startSession({
      userId: form.userId,
      size: effectiveSize,
      queueTracks: queueTracks.length ? queueTracks : undefined
    })
    sessionId.value = result.sessionId
    applySessionMode(result.mode)
    startedAt.value = Date.now()
    await loadNextTrack()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to start swipe session'
    sessionId.value = null
  } finally {
    starting.value = false
  }
}

async function loadNextTrack() {
  if (!sessionId.value) return
  loading.value = true
  error.value = null

  try {
    const { trackId, mode } = await fetchNext({ sessionId: sessionId.value })
    applySessionMode(mode)

    if (trackId === '-1') {
      sessionComplete.value = true
      currentTrack.value = null
    } else {
      currentTrack.value = trackId
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to fetch next track'
  } finally {
    loading.value = false
  }
}

function recordDecision(action: DecisionRecord['action'], note?: string) {
  if (!sessionId.value || !currentTrack.value) return

  decisionLog.value.unshift({
    trackId: currentTrack.value,
    action,
    note,
    timestamp: Date.now()
  })
}

async function handleKeep() {
  if (!sessionId.value || !currentTrack.value) return
  loading.value = true

  try {
    const result = await decideKeep({ sessionId: sessionId.value, trackId: currentTrack.value })
    applySessionMode(result.mode)
    recordDecision('keep')
    await loadNextTrack()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to keep track'
  } finally {
    loading.value = false
  }
}

async function handleSnooze(durationMs: number) {
  if (!sessionId.value || !currentTrack.value) return
  loading.value = true

  try {
    const untilAt = Date.now() + durationMs
    const result = await decideSnooze({ sessionId: sessionId.value, trackId: currentTrack.value, untilAt })
    applySessionMode(result.mode)
    recordDecision('snooze', `Snoozed until ${new Date(untilAt).toLocaleString()}`)
    await loadNextTrack()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to snooze track'
  } finally {
    loading.value = false
  }
}

async function handleAddToPlaylist() {
  if (!sessionId.value || !currentTrack.value || !form.playlistId.trim()) return
  loading.value = true

  try {
    const result = await decideAddToPlaylist({
      sessionId: sessionId.value,
      trackId: currentTrack.value,
      playlistId: form.playlistId.trim()
    })
    applySessionMode(result.mode)
    recordDecision('add-to-playlist', `Added to ${form.playlistId.trim()}`)
    await loadNextTrack()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to add track to playlist'
  } finally {
    loading.value = false
  }
}

async function handleSkip() {
  recordDecision('skip')
  await loadNextTrack()
}

async function handleEndSession() {
  if (!sessionId.value) return
  try {
    await endSession({ sessionId: sessionId.value })
  } catch (err) {
    console.warn('Failed to end session cleanly', err)
  }
  sessionId.value = null
  sessionComplete.value = false
  currentTrack.value = null
  startedAt.value = null
  sessionMode.value = null
  statusNotice.value = null
}
</script>

<template>
  <section class="swipe-shell">
    <div class="swipe-focus">
      <article v-if="error" class="alert">{{ error }}</article>
      <article v-else-if="statusNotice" class="notice">{{ statusNotice }}</article>

      <div v-if="sessionActive" class="session-status">
        <div>
          <span class="status-label">Session ID</span>
          <strong>{{ sessionId }}</strong>
        </div>
        <div>
          <span class="status-label">Elapsed</span>
          <strong>{{ sessionElapsedMinutes }} min</strong>
        </div>
        <div v-if="sessionMode === 'offline'">
          <span class="status-label">Mode</span>
          <strong>Offline demo</strong>
        </div>
        <button class="session-end" type="button" @click="handleEndSession">End session</button>
      </div>

      <div v-if="sessionComplete" class="session-complete">
        <h3>Session complete</h3>
        <p>You reviewed {{ decisionLog.length }} tracks. Start a new session to continue.</p>
      </div>

      <div v-else-if="currentTrack" class="track-card">
        <div class="track-overview">
          <div
            class="track-art"
            :class="{ 'track-art--image': spotifyEmbedMeta.thumbnailUrl, 'track-art--loading': embedLoading }"
          >
            <img
              v-if="spotifyEmbedMeta.thumbnailUrl"
              :src="spotifyEmbedMeta.thumbnailUrl"
              :alt="currentTrackTitle || 'Spotify track art'"
              loading="lazy"
            />
            <span v-else>{{ trackInitials }}</span>
          </div>
          <div class="track-meta">
            <span class="eyebrow">From your liked songs</span>
            <h3>{{ currentTrackTitle }}</h3>
            <p v-if="currentTrackArtist" class="track-artist">{{ currentTrackArtist }}</p>
            <p>
              Choose what to do with this track: keep it active, snooze it to review later, or add it to a playlist.
            </p>
            <p v-if="currentTrackMeta" class="track-id-hint">Track ID • {{ currentTrack }}</p>
            <ul v-if="currentScore !== null || currentLastPlayed || trackAddedAt || trackStats" class="track-stats">
              <li v-if="currentScore !== null" class="track-stat">
                <span class="track-stat__label">Resurfacing score</span>
                <strong class="track-stat__value">{{ currentScore }}</strong>
              </li>
              <li v-if="currentLastPlayed" class="track-stat">
                <span class="track-stat__label">Last played</span>
                <strong class="track-stat__value">{{ currentLastPlayed.relative }} · {{ currentLastPlayed.absolute }}</strong>
              </li>
              <li v-if="trackAddedAt" class="track-stat">
                <span class="track-stat__label">Liked date</span>
                <strong class="track-stat__value">{{ trackAddedAt.relative }} · {{ trackAddedAt.absolute }}</strong>
              </li>
              <li v-if="trackStats && trackStats.available !== null" class="track-stat">
                <span class="track-stat__label">Availability</span>
                <strong class="track-stat__value" :class="{ 'track-stat__value--warning': !trackStats.available }">
                  {{ trackStats.available ? 'Streaming' : 'Unavailable' }}
                </strong>
              </li>
              <li v-if="trackStats && trackStats.tempo !== null" class="track-stat">
                <span class="track-stat__label">Tempo</span>
                <strong class="track-stat__value">{{ trackStats.tempo }} BPM</strong>
              </li>
              <li v-if="trackStats && trackStats.energy !== null" class="track-stat">
                <span class="track-stat__label">Energy</span>
                <strong class="track-stat__value">{{ trackStats.energy }}%</strong>
              </li>
              <li v-if="trackStats && trackStats.valence !== null" class="track-stat">
                <span class="track-stat__label">Valence</span>
                <strong class="track-stat__value">{{ trackStats.valence }}%</strong>
              </li>
            </ul>
          </div>
        </div>
        <div v-if="spotifyPreviewTrackId" class="track-preview">
          <SpotifyPreview :track-id="spotifyPreviewTrackId" />
        </div>

        <div class="track-actions">
          <button :disabled="loading" class="primary" type="button" @click="handleKeep">Keep</button>
          <div class="snooze-menu">
            <span>Snooze</span>
            <div class="snooze-options">
              <button
                v-for="option in durationOptions"
                :key="option.label"
                :disabled="loading"
                type="button"
                @click="handleSnooze(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div class="playlist-action">
            <label>
              <span>Playlist ID</span>
              <input v-model="form.playlistId" placeholder="release-day-refresh" type="text" />
            </label>
            <button :disabled="loading || !form.playlistId" type="button" @click="handleAddToPlaylist">
              Add to playlist
            </button>
          </div>
          <button :disabled="loading" class="ghost" type="button" @click="handleSkip">Skip</button>
        </div>
      </div>

      <div v-else-if="sessionActive" class="track-card track-card--loading">
        <span>Loading next track…</span>
      </div>
    </div>

    <header class="swipe-header">
      <div>
        <span class="badge">Swipe Sessions</span>
        <h2>Start a review session</h2>
        <p>
          Load tracks from your library and decide what to keep, snooze, or add to a playlist.
        </p>
      </div>
      <form class="launch-form" @submit.prevent="startNewSession">
        <label>
          <span>Number of tracks</span>
          <input v-model.number="form.size" min="1" type="number" placeholder="How many tracks?" />
        </label>
        <label class="queue-field">
          <span>Manual track list (optional, one per line)</span>
          <textarea
            v-model="form.queueText"
            rows="4"
            placeholder="track-001&#10;track-002&#10;track-003"
          />
        </label>
        <div class="likes-actions">
          <button type="button" :disabled="likesLoading || !form.userId.trim()" @click="loadAndRankTracks">
            <span v-if="likesLoading">Loading tracks…</span>
            <span v-else>Load tracks</span>
          </button>
          <p v-if="likesError" class="likes-status likes-status--error">{{ likesError }}</p>
          <p v-else-if="likesPulledCount !== null" class="likes-status">
            Loaded {{ likesPulledCount }} track{{ likesPulledCount === 1 ? '' : 's' }}.
          </p>
        </div>
        <div v-if="likesPreview.length" class="likes-preview">
          <span>Preview:</span>
          <ul>
            <li v-for="label in likesPreview" :key="label">{{ label }}</li>
          </ul>
        </div>
        <div class="queue-summary">
          <span v-if="queueCount">{{ queueCount }} tracks ready.</span>
          <span v-else>No tracks loaded yet.</span>
        </div>
        <button :disabled="starting" type="submit">
          <span v-if="starting">Starting…</span>
          <span v-else>{{ sessionActive ? 'Restart' : 'Start session' }}</span>
        </button>
      </form>
    </header>

    <div class="swipe-history" v-if="decisionLog.length">
      <div class="decision-log">
        <h3>Latest decisions</h3>
        <ul>
          <li v-for="decision in decisionLog" :key="decision.timestamp">
            <span class="log-action">{{ decision.action }}</span>
            <span class="log-track">{{ decision.trackId }}</span>
            <span class="log-note" v-if="decision.note">{{ decision.note }}</span>
            <time>{{ new Date(decision.timestamp).toLocaleTimeString() }}</time>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.swipe-shell {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2.5rem;
  border-radius: 24px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 30px 50px rgba(0, 0, 0, 0.4);
}

.swipe-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.5rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: rgba(29, 185, 84, 0.2);
  color: #1ed760;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.swipe-header h2 {
  margin: 0.75rem 0 0.6rem;
  font-size: 2rem;
}

.swipe-header p {
  margin: 0;
  max-width: 38ch;
  color: rgba(255, 255, 255, 0.62);
}

.launch-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
  background: rgba(34, 34, 34, 0.8);
  border-radius: 18px;
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.launch-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.queue-field {
  grid-column: span 2;
}

.launch-form input {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
}

.launch-form textarea {
  resize: vertical;
  min-height: 120px;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
  font-family: inherit;
}

.launch-form input:focus {
  outline: 2px solid rgba(29, 185, 84, 0.45);
}

.launch-form button {
  align-self: stretch;
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  background: linear-gradient(135deg, #1db954, #1ed760);
  color: #121212;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.likes-actions,
.queue-summary {
  grid-column: span 2;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.likes-preview {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.likes-preview ul {
  margin: 0;
  padding-left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  list-style: disc;
}

.likes-actions button {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.85);
  padding: 0.55rem 1.2rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.likes-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.likes-actions button:not(:disabled):hover {
  border-color: rgba(29, 185, 84, 0.45);
  transform: translateY(-1px);
}

.likes-status {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.likes-status--error {
  color: #ff9c9c;
}

.queue-summary {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
  flex-wrap: wrap;
}

.launch-form button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.launch-form button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(29, 185, 84, 0.28);
}

.swipe-focus {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.swipe-history {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1rem;
}

.alert {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: rgba(255, 85, 85, 0.12);
  border: 1px solid rgba(255, 85, 85, 0.35);
  color: #ffbaba;
}

.notice {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: rgba(29, 185, 84, 0.12);
  border: 1px solid rgba(29, 185, 84, 0.35);
  color: #a8f2c5;
}

.session-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: rgba(24, 24, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.status-label {
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.session-end {
  margin-left: auto;
  border-radius: 999px;
  border: none;
  padding: 0.5rem 1.2rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
}

.session-end:hover {
  background: rgba(255, 255, 255, 0.18);
}

.session-complete {
  padding: 2rem;
  border-radius: 18px;
  background: rgba(24, 24, 24, 0.82);
  border: 1px solid rgba(30, 215, 96, 0.2);
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

.track-card {
  display: grid;
  gap: 1.75rem;
  padding: 2rem;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(12, 12, 12, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 26px 44px rgba(0, 0, 0, 0.35);
}

.track-card--loading {
  place-items: center;
  min-height: 200px;
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.7);
}

.track-overview {
  display: flex;
  gap: 1.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.track-art {
  width: 140px;
  height: 140px;
  border-radius: 24px;
  background: radial-gradient(circle at 30% 20%, rgba(30, 215, 96, 0.7), rgba(18, 18, 18, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #0b0b0b;
  overflow: hidden;
  position: relative;
}

.track-art span {
  letter-spacing: 0.08em;
}

.track-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.track-art--image {
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
}

.track-art--loading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0));
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.track-meta {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.track-meta h3 {
  margin: 0;
  font-size: 1.8rem;
}

.track-meta p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
}

.track-preview {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
}

.track-preview iframe {
  display: block;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  50% {
    background-position: 0 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.track-artist {
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.track-id-hint {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
}

.track-liked {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
}

.track-liked span {
  color: rgba(255, 255, 255, 0.35);
}

.track-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.track-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 110px;
}

.track-stat__label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
}

.track-stat__value {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.track-stat__value--warning {
  color: #ff9c9c;
}

.track-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: start;
}

.track-actions button {
  border-radius: 999px;
  border: none;
  padding: 0.7rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.track-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.primary {
  background: linear-gradient(135deg, #1db954, #1ed760);
  color: #121212;
}

.primary:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(29, 185, 84, 0.28);
}

.ghost {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.82);
}

.ghost:hover {
  background: rgba(255, 255, 255, 0.2);
}

.snooze-menu {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.snooze-menu span {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
}

.snooze-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.snooze-options button {
  width: 100%;
  border-radius: 12px;
  padding: 0.55rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.snooze-options button:hover {
  background: rgba(255, 255, 255, 0.18);
}

.playlist-action {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.playlist-action label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
}

.playlist-action input {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.4);
  color: #ffffff;
}

.playlist-action button {
  border-radius: 12px;
  padding: 0.6rem 1rem;
  background: rgba(29, 185, 84, 0.2);
  color: #1ed760;
}

.playlist-action button:hover {
  background: rgba(29, 185, 84, 0.28);
}

.decision-log {
  padding: 1.5rem;
  border-radius: 16px;
  background: rgba(12, 12, 12, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.decision-log h3 {
  margin: 0 0 1rem;
}

.decision-log ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.decision-log li {
  display: grid;
  grid-template-columns: 100px 1fr auto auto;
  gap: 0.75rem;
  align-items: baseline;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.log-action {
  text-transform: capitalize;
  color: #1ed760;
}

.log-note {
  color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 960px) {
  .swipe-shell {
    padding: 2rem;
  }

  .track-card {
    grid-template-columns: 1fr;
  }

  .track-art {
    width: 90px;
    height: 90px;
    border-radius: 20px;
  }

  .decision-log li {
    grid-template-columns: 90px 1fr;
    grid-auto-rows: auto;
  }

  .decision-log time {
    justify-self: start;
  }
}

@media (max-width: 640px) {
  .launch-form {
    grid-template-columns: 1fr;
  }

  .track-actions {
    grid-template-columns: 1fr;
  }

  .decision-log li {
    grid-template-columns: 1fr;
  }
}
</style>
