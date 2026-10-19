<template>
  <view ref="scene_root" class="ambient-scene" aria-hidden="true">
    <image class="ambient-scene__poster" :src="poster" mode="aspectFill" aria-hidden="true" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { AMBIENT_SCENES, create_scene_motion } from '@/utils/ambientScene'
import { use_ambient_activity } from '@/utils/useAmbientActivity'

const props = defineProps({ scene: { type: String, default: 'home' } })
const poster = computed(() => AMBIENT_SCENES[props.scene] || AMBIENT_SCENES.home)
const scene_root = ref(null)
let motion = null
use_ambient_activity(({ active, reduced }) => {
  const container = scene_root.value?.$el || scene_root.value
  if (active && !motion) motion = create_scene_motion(container, props.scene)
  motion?.setVisible(!reduced)
  motion?.setActive(active)
  if (reduced) container.dataset.sceneMotion = 'static'
}, () => {
  motion?.destroy()
  motion = null
})
</script>

<style scoped>
.ambient-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.ambient-scene__poster,
.ambient-scene :deep(.ambient-scene__motion) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ambient-scene :deep(.ambient-scene__motion) {
  opacity: 0;
}
</style>
