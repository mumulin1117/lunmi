<template>
  <view class="lantern-ritual" :class="[`lantern-ritual--${kind}`, `lantern-ritual--${state}`, { 'lantern-ritual--paused': !is_visible || !art_ready, 'lantern-ritual--reduced': is_reduced }]" :style="ritual_style" aria-hidden="true" :data-ritual="kind" :data-ritual-state="state">
    <view v-if="kind !== 'wish'" class="ritual-water">
      <view v-for="ring in 3" :key="ring" class="ritual-ring" :style="{ '--ring-delay': `${(ring - 1) * 170}ms` }" />
    </view>
    <view class="ritual-action" @animationend="on_animation_end">
      <template v-if="kind === 'scoop'">
        <image class="ritual-net" @load="mark_art_ready" @error="mark_art_ready" src="/static/icon/lantern_home_scoop_card.png" mode="aspectFit" />
        <image v-if="state === 'complete'" class="ritual-catch" src="/static/icon/lantern_home_release_card.png" mode="aspectFit" />
        <view v-for="drop in 3" :key="drop" class="ritual-drop" :style="{ '--drop-index': drop }" />
      </template>
      <template v-else-if="kind === 'wish'">
        <view class="ritual-hook" />
        <image class="ritual-wish" @load="mark_art_ready" @error="mark_art_ready" src="/static/icon/wish_tree_lantern_inner.png" mode="aspectFit" />
      </template>
      <template v-else>
        <view class="ritual-glow" />
        <image class="ritual-lotus" @load="mark_art_ready" @error="mark_art_ready" src="/static/icon/lantern_home_release_card.png" mode="aspectFit" />
        <image class="ritual-reflection" src="/static/icon/lantern_home_release_card.png" mode="aspectFit" />
      </template>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { use_ambient_activity } from '@/utils/useAmbientActivity'

const props = defineProps({
  kind: { type: String, default: 'release' },
  state: { type: String, default: 'waiting' },
  branchLevel: { type: String, default: 'mid' }
})
const emit = defineEmits(['complete'])
const art_ready = ref(false)
let art_timeout = null
const mark_art_ready = () => {
  art_ready.value = true;
  clearTimeout(art_timeout)
}
onMounted(() => { if (!art_ready.value) art_timeout = setTimeout(mark_art_ready, 2000) })
const { is_visible, is_reduced } = use_ambient_activity()
const ritual_style = computed(() => ({
  '--wish-anchor': ({ low: '48%', mid: '36%', high: '24%' })[props.branchLevel.toLowerCase()] || '36%'
}))
let completion_timer = null
let completed = false
const clear_completion = () => {
  clearTimeout(completion_timer);
  completion_timer = null
}
const complete = () => {
  if (completed || props.state !== 'complete' || !is_visible.value || !art_ready.value) return
  completed = true
  clear_completion()
  emit('complete')
}
const on_animation_end = (event) => {
  if (event.target === event.currentTarget && /^ritual-(release|scoop|hang)(?:-|$)/.test(event.animationName || '')) complete()
}
watch([() => props.state, is_visible, is_reduced, art_ready], ([state, visible, reduced, ready]) => {
  clear_completion()
  if (state !== 'complete') completed = false
  if (state === 'complete' && visible && ready && !completed) {
    // Fallback also completes when CSS animation events are unavailable.
    completion_timer = setTimeout(complete, reduced ? 120 : 1320)
  }
}, { immediate: true, flush: 'post' })
onBeforeUnmount(() => {
  clear_completion();
  clearTimeout(art_timeout)
})
</script>

<style scoped>
.lantern-ritual { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.ritual-action { position: absolute; top: 64%; left: calc(50% - 120rpx); width: 240rpx; height: 240rpx; transform-origin: 50% 65%; }
.ritual-lotus, .ritual-net, .ritual-wish { position: absolute; inset: 0; width: 100%; height: 100%; }
.ritual-glow { position: absolute; inset: 5%; border-radius: 50%; background: radial-gradient(ellipse, rgba(255,210,147,.5), rgba(226,154,249,.12) 55%, transparent 72%); opacity: .65; }
.ritual-reflection { position: absolute; top: 65%; left: 8%; width: 84%; height: 70%; opacity: .18; transform: scaleY(-.6); }
.ritual-water { position: absolute; top: 77%; left: 50%; width: 1px; height: 1px; }
.ritual-ring { position: absolute; left: -140rpx; top: -35rpx; width: 280rpx; height: 70rpx; border: 1px solid rgba(255,218,174,.65); border-radius: 50%; opacity: 0; }
.lantern-ritual--waiting .ritual-action { animation: ritual-wait 3s ease-in-out infinite; }
.lantern-ritual--waiting .ritual-ring { animation: ritual-ripple 2.4s ease-out var(--ring-delay) infinite; }
.lantern-ritual--complete .ritual-ring { animation: ritual-ripple 950ms ease-out var(--ring-delay) both; }
.lantern-ritual--release.lantern-ritual--complete .ritual-action { animation: ritual-release 1250ms cubic-bezier(.25,.65,.3,1) both; }
.lantern-ritual--complete .ritual-glow { animation: ritual-light 1250ms ease-out both; }
.lantern-ritual--scoop .ritual-action { top: 57%; left: calc(50% - 160rpx); width: 320rpx; height: 300rpx; transform-origin: 70% 5%; }
.lantern-ritual--scoop.lantern-ritual--waiting .ritual-action { animation: ritual-dip 2.8s ease-in-out infinite; }
.lantern-ritual--scoop.lantern-ritual--complete .ritual-action { animation: ritual-scoop 1250ms cubic-bezier(.22,.7,.3,1) both; }
.ritual-catch { position: absolute; top: 55%; left: 15%; width: 45%; height: 45%; animation: ritual-catch 1250ms ease-out both; }
.ritual-drop { position: absolute; top: 90%; left: calc(20% + var(--drop-index) * 9%); width: 5rpx; height: 14rpx; border-radius: 60%; background: rgba(161,218,255,.75); opacity: 0; }
.lantern-ritual--complete .ritual-drop { animation: ritual-drop 620ms ease-in calc(250ms + var(--drop-index) * 80ms) both; }
.lantern-ritual--wish .ritual-action { top: var(--wish-anchor); left: calc(50% - 90rpx); width: 180rpx; height: 330rpx; transform-origin: 50% 0; }
.lantern-ritual--wish.lantern-ritual--waiting .ritual-action { transform: translateY(18vh); animation: ritual-wish-wait 3s ease-in-out infinite; }
.lantern-ritual--wish.lantern-ritual--complete .ritual-action { animation: ritual-hang 1250ms cubic-bezier(.22,.7,.3,1) both; }
.ritual-hook { position: absolute; top: 0; left: calc(50% - 8rpx); width: 16rpx; height: 10rpx; border: 1px solid rgba(255,219,168,.8); border-top: 0; border-radius: 0 0 50% 50%; opacity: 0; }
.lantern-ritual--complete .ritual-hook { animation: ritual-hook 1250ms ease-out both; }
.lantern-ritual--empty .ritual-action, .lantern-ritual--error .ritual-action { opacity: .25; transform: translateY(20rpx); transition: opacity 240ms ease, transform 240ms ease; }
.lantern-ritual--empty .ritual-ring { animation: ritual-ripple 600ms ease-out both; }
.lantern-ritual--paused *, .lantern-ritual--paused .ritual-action { animation-play-state: paused !important; }
.lantern-ritual--reduced *, .lantern-ritual--reduced .ritual-action { animation: none !important; }
.lantern-ritual--reduced .ritual-ring, .lantern-ritual--reduced .ritual-drop { display: none; }
.lantern-ritual--reduced.lantern-ritual--wish .ritual-action { transform: none; }
@keyframes ritual-wait { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5rpx); } }
@keyframes ritual-ripple { 0% { opacity: 0; transform: scale(.3); } 22% { opacity: .65; } 100% { opacity: 0; transform: scale(1.65); } }
@keyframes ritual-light { 0% { opacity: .2; transform: scale(.75); } 28% { opacity: 1; transform: scale(1.15); } 100% { opacity: .2; transform: scale(.65); } }
@keyframes ritual-release { 0% { opacity: .6; transform: translateY(30rpx) scale(.92); } 22% { opacity: 1; transform: translateY(0) scale(1); } 48% { opacity: 1; transform: translateY(-12rpx) scale(.96); } 100% { opacity: 0; transform: translate(45rpx,-145rpx) scale(.43); } }
@keyframes ritual-dip { 0%,100% { transform: translateY(4rpx) rotate(-6deg); } 50% { transform: translateY(22rpx) rotate(-11deg); } }
@keyframes ritual-scoop { 0% { transform: translateY(22rpx) rotate(-11deg); } 48% { transform: translateY(-45rpx) rotate(4deg); } 78% { transform: translateY(-52rpx) rotate(-2deg); } 100% { transform: translateY(-48rpx) rotate(0); } }
@keyframes ritual-catch { 0%,32% { opacity: 0; transform: scale(.65); } 65% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ritual-drop { 0% { opacity: 0; transform: translateY(0) scale(.7); } 15% { opacity: .8; } 100% { opacity: 0; transform: translateY(75rpx) scale(.3); } }
@keyframes ritual-wish-wait { 0%,100% { opacity: .65; transform: translateY(18vh) rotate(-2deg); } 50% { opacity: .9; transform: translateY(18vh) rotate(2deg); } }
@keyframes ritual-hang { 0% { opacity: .6; transform: translateY(18vh) rotate(-7deg); } 46% { opacity: 1; transform: translateY(-5rpx) rotate(2deg); } 58% { transform: translateY(0) rotate(-7deg); } 73% { transform: rotate(5deg); } 87% { transform: rotate(-2deg); } 100% { opacity: 1; transform: rotate(0); } }
@keyframes ritual-hook { 0%,45% { opacity: 0; } 60%,100% { opacity: 1; } }
</style>
