<template>
  <div class="app-container w-full min-h-screen bg-white">
    <div class="debug-info" v-if="debug" style="padding: 10px; background-color: #f0f0f0; margin-bottom: 10px; border: 1px solid #ccc;">
      <p><strong>Debug Mode</strong></p>
      <p>Vue is {{ vueLoaded ? 'working' : 'not working' }}</p>
      <p>Router view should be below:</p>
    </div>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import '~/assets/styles/tailwind.css'

const debug = ref(true)
const vueLoaded = ref(true)

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
