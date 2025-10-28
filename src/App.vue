<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import SwipeSession from './components/SwipeSession.vue'
import { API_BASE_URL, DEFAULT_API_ORIGIN } from './config'

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

const stage = ref<Stage>('connect')
const connected = ref(false)

const permissionOptions = reactive([
  {
    id: 'likes',
    label: 'Liked tracks',
    description: 'Access your saved songs to find old favorites.'
  },
  {
    id: 'playlists',
    label: 'Playlists',
    description: 'View your playlists to find duplicates and issues.'
  },
  {
    id: 'history',
    label: 'Listening history',
    description: 'Check what you\'ve been playing recently.'
  }
])

const enabledPermissions = ref<string[]>(['likes', 'playlists'])

const insights = [
  { label: 'Tracks reviewed this week', value: '132' },
  { label: 'Playlists cleaned', value: '8' },
  { label: 'Songs snoozed', value: '29' }
]

const journeyCards = [
  {
    id: 'timecapsule',
    title: 'Time-Capsule',
    description: 'Find songs you haven\'t listened to in a long time.',
    detail: '8 tracks ready to review',
    cta: 'Open Time-Capsule',
    stage: 'timecapsule' as Stage
  },
  {
    id: 'swipe',
    title: 'Swipe Sessions',
    description: 'Quickly review your liked songs and organize them.',
    detail: 'Review your music library',
    cta: 'Start session',
    stage: 'swipe' as Stage
  },
  {
    id: 'playlist',
    title: 'Playlist Surgery',
    description: 'Clean up a playlist by finding duplicates and broken tracks.',
    detail: 'Analyze and fix issues',
    cta: 'Analyze playlist',
    stage: 'playlist' as Stage
  }
]

const timeCapsuleQueue = [
  { title: 'Verano en la Ciudad', artist: 'Los Bandidos', lastPlayed: 'Summer 2018', staleness: 92 },
  { title: 'Midnight Freeway', artist: 'Neon Reyes', lastPlayed: 'Nov 2019', staleness: 86 },
  { title: 'Norteño Sunrise', artist: 'La Costa', lastPlayed: 'Apr 2017', staleness: 81 },
  { title: 'Dos Mundos', artist: 'Orquesta Verde', lastPlayed: 'Jan 2016', staleness: 77 },
  { title: 'Fuel the Drive', artist: 'Static Echoes', lastPlayed: 'Feb 2018', staleness: 74 },
  { title: 'Nebula Skies', artist: 'Aurora Waves', lastPlayed: 'Sep 2015', staleness: 88 },
  { title: 'Seafoam Vinyl', artist: 'Velvet Rooms', lastPlayed: 'Jul 2014', staleness: 84 },
  { title: 'Coffee On 3rd', artist: 'Mima & The City', lastPlayed: 'Mar 2016', staleness: 79 }
]

const playlistFindings = {
  duplicates: [
    { track: 'On the Road Again', note: 'This song appears twice in your playlist.' },
    { track: 'Corazón de México', note: 'Appears in multiple playlists.' }
  ],
  unavailable: [
    { track: 'Desert Skies', note: 'This track is no longer available on Spotify.' }
  ],
  outliers: [
    { track: 'Throat Singing 101', note: 'Doesn\'t match the energy of other songs.' },
    { track: 'Rainy Day Lo-Fi', note: 'Doesn\'t match the mood of this playlist.' }
  ]
}

const storyMoments = [
  { time: '08:00', label: 'Connect', description: 'Link your Spotify account.' },
  { time: '08:05', label: 'Choose', description: 'Pick what you want to do.' },
  { time: '08:15', label: 'Review', description: 'Go through your music.' },
  { time: '08:35', label: 'Organize', description: 'Clean up playlists or add songs.' },
  { time: '08:50', label: 'Done', description: 'Your music library is refreshed.' }
]

const swipeQueue = ref<string[]>(['track-001', 'track-002', 'track-003'])

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

function connectAccount() {
  connected.value = true
  stage.value = 'hub'
}

function disconnectAccount() {
  connected.value = false
  stage.value = 'connect'
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

const heroContent = computed<HeroContent>(() => {
  switch (stage.value) {
    case 'connect':
      if (connected.value) {
        return {
          badge: 'Setup',
          title: 'Your account is connected',
          copy:
            'You can now use all features. Adjust permissions below or disconnect if needed.',
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
          'Choose what data Resurfacer can access. You stay in control of your privacy while getting personalized recommendations.',
        primaryLabel: 'Connect account',
        primaryAction: connectAccount
      }
    case 'hub':
      return {
        badge: "What's next",
        title: 'What would you like to do?',
        copy:
          'Rediscover forgotten songs, review and organize tracks, or clean up your playlists.',
        primaryLabel: 'Start Swipe Session',
        primaryAction: () => goToStage('swipe'),
        secondaryLabel: 'Browse Time-Capsule',
        secondaryAction: () => goToStage('timecapsule')
      }
    case 'swipe':
      return {
        badge: 'Swipe Sessions',
        title: 'Review your music',
        copy:
          'Go through your liked songs and decide what to keep, snooze for later, or add to a playlist.',
        primaryLabel: 'Back',
        primaryAction: goHome
      }
    case 'timecapsule':
      return {
        badge: 'Time-Capsule',
        title: 'Rediscover old favorites',
        copy:
          'Find songs you haven\'t listened to in a while. Review how long it\'s been and add them back to your rotation.',
        primaryLabel: 'Back',
        primaryAction: goHome
      }
    case 'playlist':
      return {
        badge: 'Playlist Surgery',
        title: 'Clean up your playlist',
        copy:
          'Find and fix duplicates, unavailable tracks, and songs that don\'t fit the mood.',
        primaryLabel: 'Back',
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
  const total = timeCapsuleQueue.length

  if (!total) {
    return {
      queueSize: 0,
      averageStaleness: 0,
      highStalenessCount: 0,
      spotlightTrack: null,
      uniqueArtists: 0
    }
  }

  const stalenessValues = timeCapsuleQueue.map((item) => item.staleness)
  const averageStaleness = Math.round(stalenessValues.reduce((sum, value) => sum + value, 0) / total)
  const highStalenessCount = timeCapsuleQueue.filter((item) => item.staleness >= 85).length
  const spotlightTrack = [...timeCapsuleQueue].sort((a, b) => b.staleness - a.staleness)[0] ?? null
  const uniqueArtists = new Set(timeCapsuleQueue.map((item) => item.artist)).size

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
          <button class="hero__cta" type="button" @click="heroContent.primaryAction">{{ heroContent.primaryLabel }}</button>
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
            <p>Here's what you need to do:</p>
            <ul>
              <li>Connect your Spotify account with the permissions you choose.</li>
              <li>Your liked tracks will be analyzed to find old favorites.</li>
              <li>Playlists can be scanned for duplicates and other issues.</li>
            </ul>
          </article>
        </div>

        <div class="connect-main-grid">
          <div class="connect-permissions">
            <h2>Choose permissions</h2>
            <p>
              Select what data Resurfacer can access from your Spotify account.
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
          </div>

          <section class="story-panel story-panel--connect">
            <header>
              <h2>How it works</h2>
              <p>A typical session from start to finish.</p>
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
            <h2>AI Assistant</h2>
            <p>
              We're building an AI assistant to help you manage your music library automatically.
            </p>
          </div>
          <ul class="ai-preview__list">
            <li>
              <strong>Smart suggestions</strong>
              <p>Get recommendations based on your listening habits.</p>
            </li>
            <li>
              <strong>Playlist health check</strong>
              <p>Automatically find duplicates and broken tracks.</p>
            </li>
            <li>
              <strong>Personalized actions</strong>
              <p>Let AI suggest what to do with your music.</p>
            </li>
          </ul>
        </section>
      </template>

      <template v-else-if="stage === 'swipe'">
        <section class="flow-plan">
          <h2>How this works</h2>
          <p>
            Review songs from your liked tracks. Keep what you want to hear more, snooze songs you're not in the mood for, or add tracks to a specific playlist.
          </p>
          <ul>
            <li>Each session loads songs you haven't reviewed yet.</li>
            <li>You control how many tracks to review per session.</li>
            <li>Snoozed songs won't appear again for a while.</li>
          </ul>
        </section>
        <SwipeSession class="flow-session" :seed-tracks="swipeQueue" @update:seedTracks="setSwipeQueue" />
      </template>

      <template v-else-if="stage === 'timecapsule'">
        <section class="timecapsule-summary">
          <div class="timecapsule-header">
            <h2>Your old favorites</h2>
            <p>
              These are songs you haven't listened to recently. Review the list and add any you'd like to hear again to your next Swipe Session.
            </p>
          </div>

          <div class="timecapsule-overview">
            <article class="timecapsule-stat">
              <span class="timecapsule-stat__label">Total tracks</span>
              <strong class="timecapsule-stat__value">{{ timeCapsuleStats.queueSize }}</strong>
              <p>Songs you haven't heard recently.</p>
            </article>
            <article class="timecapsule-stat">
              <span class="timecapsule-stat__label">Average time</span>
              <strong class="timecapsule-stat__value">{{ timeCapsuleStats.averageStaleness }}%</strong>
              <p>{{ timeCapsuleStats.highStalenessCount }} haven't been played in a long time.</p>
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
                <h3>All tracks</h3>
                <p>Add a track to your next Swipe Session to review it.</p>
              </header>
              <table class="timecapsule-table">
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Artist</th>
                    <th>Last played</th>
                    <th>Score</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in timeCapsuleQueue" :key="row.title">
                    <td>{{ row.title }}</td>
                    <td>{{ row.artist }}</td>
                    <td>{{ row.lastPlayed }}</td>
                    <td><span class="pill">{{ row.staleness }}</span></td>
                    <td>
                      <button
                        type="button"
                        :disabled="swipeQueue.includes(row.title)"
                        @click="queueTrackForSwipe(row.title)"
                      >
                        {{ swipeQueue.includes(row.title) ? 'Added' : 'Add to session' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <aside class="timecapsule-sidebar">
              <div v-if="timeCapsuleStats.spotlightTrack" class="timecapsule-spotlight">
                <span class="timecapsule-spotlight__badge">Featured</span>
                <h3>{{ timeCapsuleStats.spotlightTrack.title }}</h3>
                <p>{{ timeCapsuleStats.spotlightTrack.artist }} · Last played {{ timeCapsuleStats.spotlightTrack.lastPlayed }}</p>
                <p>
                  This song has a score of {{ timeCapsuleStats.spotlightTrack.staleness }}—you haven't listened to it in a while. Add it to your next session to decide if you want to hear it again.
                </p>
                <button
                  type="button"
                  :disabled="swipeQueue.includes(timeCapsuleStats.spotlightTrack.title)"
                  @click="queueTrackForSwipe(timeCapsuleStats.spotlightTrack.title)"
                >
                  {{ swipeQueue.includes(timeCapsuleStats.spotlightTrack.title) ? 'Already added' : 'Add to session' }}
                </button>
              </div>

                            <div class="timecapsule-guidance">
                <h3>What you can do</h3>
                <ul>
                  <li>Add songs you want to hear again to your next Swipe Session.</li>
                  <li>Create a new playlist with your old favorites.</li>
                  <li>Come back later to see more songs from your past.</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </template>

      <template v-else-if="stage === 'playlist'">
        <section class="playlist-report">
          <h2>Playlist analysis</h2>
          <p>Here are the issues found in your playlist.</p>
          <div class="report-columns">
            <div>
              <h3>Duplicates</h3>
              <ul>
                <li v-for="item in playlistFindings.duplicates" :key="item.track">
                  <strong>{{ item.track }}</strong>
                  <p>{{ item.note }}</p>
                  <button type="button">Remove duplicate</button>
                </li>
              </ul>
            </div>
            <div>
              <h3>Unavailable</h3>
              <ul>
                <li v-for="item in playlistFindings.unavailable" :key="item.track">
                  <strong>{{ item.track }}</strong>
                  <p>{{ item.note }}</p>
                  <button type="button">Swap source</button>
                </li>
              </ul>
            </div>
            <div>
              <h3>Mood outliers</h3>
              <ul>
                <li v-for="item in playlistFindings.outliers" :key="item.track">
                  <strong>{{ item.track }}</strong>
                  <p>{{ item.note }}</p>
                  <button type="button">Tag for review</button>
                </li>
              </ul>
            </div>
          </div>
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
