<template>
  <div class="app-container w-full min-h-screen bg-white">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import '~/assets/styles/tailwind.css'

onMounted(() => {
  console.log('App component mounted')
})
</script>

<style>
.app-container {
  width: 400px;
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
}
</style>
