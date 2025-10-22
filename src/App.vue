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
    description: 'Read your saved songs to surface forgotten favorites during swipes.'
  },
  {
    id: 'playlists',
    label: 'Playlists',
    description: 'Inspect playlists to spot duplicates, unavailable tracks, and outliers.'
  },
  {
    id: 'history',
    label: 'Recent plays',
    description: 'Analyse recent listening to score staleness and energy for recommendations.'
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
    title: 'Time-Capsule Shuffler',
    description: 'Bias resurfacing toward the songs you have not heard since college summers.',
    detail: 'Bias: Old • 30 tracks queued',
    cta: 'Open Time-Capsule',
    stage: 'timecapsule' as Stage
  },
  {
    id: 'swipe',
    title: 'Swipe Session',
    description: 'Gamify resurfacing with quick keep, snooze, and playlist decisions.',
    detail: 'Goal: 30 swipes • Keep 10 favorites',
    cta: 'Start swiping',
    stage: 'swipe' as Stage
  },
  {
    id: 'playlist',
    title: 'Playlist Surgery',
    description: 'Scan a flagship playlist to clean duplicates and replace broken tracks.',
    detail: 'Findings queued: 12 issues',
    cta: 'Run analyzer',
    stage: 'playlist' as Stage
  }
]

const timeCapsuleQueue = [
  { title: 'Verano en la Ciudad', artist: 'Los Bandidos', lastPlayed: 'Summer 2018', staleness: 92 },
  { title: 'Midnight Freeway', artist: 'Neon Reyes', lastPlayed: 'Nov 2019', staleness: 86 },
  { title: 'Norteño Sunrise', artist: 'La Costa', lastPlayed: 'Apr 2017', staleness: 81 },
  { title: 'Dos Mundos', artist: 'Orquesta Verde', lastPlayed: 'Jan 2016', staleness: 77 },
  { title: 'Fuel the Drive', artist: 'Static Echoes', lastPlayed: 'Feb 2018', staleness: 74 }
]

const playlistFindings = {
  duplicates: [
    { track: 'On the Road Again', note: 'Appears twice — keep the remastered take.' },
    { track: 'Corazón de México', note: 'Duplicate across Focus Flow and Morning Revival.' }
  ],
  unavailable: [
    { track: 'Desert Skies', note: 'No longer streaming — swap for the live version.' }
  ],
  outliers: [
    { track: 'Throat Singing 101', note: 'Energy mismatch for an upbeat set.' },
    { track: 'Rainy Day Lo-Fi', note: 'Mood mismatch — tag for later review.' }
  ]
}

const storyMoments = [
  { time: '08:00', label: 'Discover', description: 'Open Resurfacer to plan a weekend playlist refresh.' },
  { time: '08:05', label: 'Connect', description: 'Authorize Spotify with only the scopes that matter.' },
  { time: '08:15', label: 'Swipe', description: 'Keep 12 resurfaced tracks after a focused session.' },
  { time: '08:35', label: 'Surgery', description: 'Resolve duplicate and broken links in a flagship playlist.' },
  { time: '08:50', label: 'Share', description: 'Publish a polished mix for everyone to enjoy.' }
]

const swipeQueue = ref<string[]>(['track-001', 'track-002', 'track-003'])

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
      return {
        badge: 'Setup',
        title: 'Link Spotify to unlock resurfacing',
        copy:
          'Toggle the data Resurfacer can read so you stay in control while unlocking the automations that keep playlists fresh.',
        primaryLabel: connected.value ? 'Reconnect account' : 'Connect account',
        primaryAction: connectAccount,
        secondaryLabel: connected.value ? 'Continue where I left off' : undefined,
        secondaryAction: connected.value ? goHome : undefined
      }
    case 'hub':
      return {
        badge: "What's next",
        title: 'Choose the next move',
        copy:
          'Explore old gems, swipe through resurfaced tracks, or repair a playlist. Each flow keeps your library intentional.',
        primaryLabel: 'Jump into Swipe Sessions',
        primaryAction: () => goToStage('swipe'),
        secondaryLabel: 'Review Time-Capsule',
        secondaryAction: () => goToStage('timecapsule')
      }
    case 'swipe':
      return {
        badge: 'Swipe Sessions',
        title: 'Gamify resurfacing in minutes',
        copy:
          'Work through resurfaced tracks, promote keepers, snooze maybes, and route anthems into the playlist that needs love.',
        primaryLabel: 'Back to flow selector',
        primaryAction: goHome
      }
    case 'timecapsule':
      return {
        badge: 'Time-Capsule Shuffler',
        title: 'Spotlight your deep cuts',
        copy:
          'Bias toward tracks you have not heard in years. Review staleness scores, then feed favorites straight into Swipe Sessions.',
        primaryLabel: 'Back to flow selector',
        primaryAction: goHome
      }
    case 'playlist':
      return {
        badge: 'Playlist Surgery',
        title: 'Patch up your playlist',
        copy:
          'Fix duplicates, replace unavailable tracks, and flag mood outliers so every mix stays on vibe.',
        primaryLabel: 'Back to flow selector',
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

    <div class="content">
      <header class="hero">
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
        <div class="connect-permissions">
          <h2>Choose what Resurfacer can read</h2>
          <p>
            Granular permissions keep privacy intact. Toggle only what you want to share while unlocking the right
            resurfacing tools.
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
        <div class="connect-summary">
          <h3>Resurfacing prep</h3>
          <ul>
            <li>Connect Spotify with scoped access tokens.</li>
            <li>Sync liked tracks to seed Time-Capsule and Swipe Sessions.</li>
            <li>Capture a playlist snapshot so Playlist Surgery can scan for issues.</li>
          </ul>
          <p class="connect-status" v-if="connected">✅ Account connected. Jump into a flow whenever you’re ready.</p>
          <p class="connect-status" v-else>Waiting for connection…</p>
        </div>
      </section>

      <template v-else-if="stage === 'hub'">
        <section class="insights">
          <article v-for="item in insights" :key="item.label" class="insight">
            <span class="insight__value">{{ item.value }}</span>
            <span class="insight__label">{{ item.label }}</span>
          </article>
        </section>

        <section class="journey-grid">
          <article v-for="card in journeyCards" :key="card.id" class="journey-card">
            <h2>{{ card.title }}</h2>
            <p>{{ card.description }}</p>
            <span class="journey-card__detail">{{ card.detail }}</span>
            <button :disabled="!connected" type="button" @click="goToStage(card.stage)">{{ card.cta }}</button>
            <p v-if="!connected" class="journey-card__locked">Connect to unlock this flow.</p>
          </article>
        </section>

        <section class="story-panel">
          <header>
            <h2>Flow timeline</h2>
            <p>Track a sample morning workflow from discovery to a refreshed playlist.</p>
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
      </template>

      <template v-else-if="stage === 'swipe'">
        <section class="flow-wrapper">
          <div class="flow-intro">
            <h2>Swipe Sessions game plan</h2>
            <p>
              The queue is preloaded from liked songs. Keep instant favorites, snooze maybes for later, and drop
              high-energy tracks into a fresh playlist.
            </p>
            <ul>
              <li>Size: 30 resurfaced tracks pulled from Time-Capsule bias.</li>
              <li>Goal: Keep at least 10 for your spotlight playlist.</li>
              <li>Tip: Snooze anything that feels off-vibe for a week.</li>
            </ul>
          </div>
          <SwipeSession :seed-tracks="swipeQueue" @update:seedTracks="setSwipeQueue" />
        </section>
      </template>

      <template v-else-if="stage === 'timecapsule'">
        <section class="timecapsule">
          <h2>Time-Capsule results</h2>
          <p>Older plays rise to the top. Send a track into Swipe Sessions or straight into a playlist.</p>
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
              <tr v-for="row in timeCapsuleQueue" :key="row.title">
                <td>{{ row.title }}</td>
                <td>{{ row.artist }}</td>
                <td>{{ row.lastPlayed }}</td>
                <td><span class="pill">{{ row.staleness }}</span></td>
                <td>
                  <button type="button" :disabled="swipeQueue.includes(row.title)" @click="queueTrackForSwipe(row.title)">
                    {{ swipeQueue.includes(row.title) ? 'Queued' : 'Queue in Swipe Session' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>

      <template v-else-if="stage === 'playlist'">
        <section class="playlist-report">
          <h2>Playlist Surgery findings</h2>
          <p>Playlist analysis finished. Apply fixes or tag items to revisit later.</p>
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

.hero {
  padding: 2.5rem;
  border-radius: 22px;
  background: radial-gradient(circle at 8% 4%, rgba(180, 155, 255, 0.3), transparent 60%),
    linear-gradient(135deg, rgba(29, 185, 84, 0.96), rgba(12, 12, 12, 0.92));
  color: var(--spotify-text);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  max-width: 760px;
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
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 2rem;
}

.connect-permissions,
.connect-summary {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 30px 50px rgba(0, 0, 0, 0.35);
}

.connect-permissions h2,
.connect-summary h3 {
  margin-top: 0;
}

.connect-permissions p,
.connect-summary p {
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

.connect-summary ul {
  margin: 1.25rem 0 1.5rem;
  padding-left: 1.2rem;
  color: rgba(255, 255, 255, 0.62);
}

.connect-summary li {
  margin-bottom: 0.75rem;
}

.connect-status {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
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

.flow-wrapper {
  display: grid;
  gap: 2rem;
}

.flow-intro {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 42px rgba(0, 0, 0, 0.32);
}

.flow-intro h2 {
  margin-top: 0;
}

.flow-intro p {
  color: rgba(255, 255, 255, 0.68);
}

.flow-intro ul {
  margin: 1.2rem 0 0;
  padding-left: 1.2rem;
  color: rgba(255, 255, 255, 0.65);
}

.flow-intro li {
  margin-bottom: 0.6rem;
}

.timecapsule {
  padding: 2rem;
  border-radius: 22px;
  background: rgba(12, 12, 12, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 26px 44px rgba(0, 0, 0, 0.32);
}

.timecapsule-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5rem;
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
}

.timecapsule-table button:disabled {
  opacity: 0.55;
  cursor: default;
  background: rgba(255, 255, 255, 0.08);
  color: var(--spotify-text-muted);
}

.timecapsule-table button:hover {
  background: rgba(29, 185, 84, 0.24);
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

  .connect-layout {
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
  }

  .sidebar__nav {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }

  .sidebar__link {
    white-space: nowrap;
  }

  .sidebar__ghost {
    display: none;
  }

  .sidebar__footer {
    display: none;
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
