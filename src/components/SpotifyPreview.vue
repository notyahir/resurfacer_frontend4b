<template>
  <div class="spotify-preview">
    <iframe
      :key="trackId"
      :src="`https://open.spotify.com/embed/track/${trackId}?utm_source=resurfacer&autoplay=1`"
      width="100%"
      height="180"
      frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="eager"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ trackId: string }>()
</script>

<style scoped>
.spotify-preview iframe {
  border-radius: 16px;
  border: none;
}
</style>
