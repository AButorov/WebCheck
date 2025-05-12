<template>
  <div class="app-container">
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
body, html {
  margin: 0;
  padding: 0;
  width: 400px;
  height: 500px;
}

.app-container {
  width: 400px;
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
  background-color: #ffffff;
  position: relative;
}
</style>
