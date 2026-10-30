<template>
  <transition name="profile-guide-reveal">
    <view v-if="is_visible" class="profile-guide" :style="guide_style" role="note" aria-live="polite">
      <view class="profile-guide__card">
        <view class="profile-guide__copy">
          <view class="profile-guide__heading">
            <text class="profile-guide__spark" aria-hidden="true">✦</text>
            <text>{{ $t('View profile') }}</text>
          </view>
          <text class="profile-guide__description">{{ $t('Tap the avatar to visit their profile.') }}</text>
        </view>
        <button class="profile-guide__done" hover-class="profile-guide__done--pressed" @click.stop="dismiss">
          {{ $t('Got it') }}
        </button>
      </view>
    </view>
  </transition>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import theme from '@/config/theme.json'
import { has_presented_profile_guide, mark_profile_guide_presented } from '@/utils/profileGuideStorage'

const props = defineProps({
  context: { type: String, required: true },
  eligible: { type: Boolean, default: false }
})
const is_visible = ref(false)
let reveal_timer = null
let was_presented = false
const guide_style = {
  '--guide-background': theme.colors.dialog.background,
  '--guide-border': theme.colors.surface.outline,
  '--guide-title': theme.colors.text.title,
  '--guide-copy': theme.colors.text.secondary,
  '--guide-accent': theme.colors.status.coin,
  '--guide-button': theme.colors.button.primary,
  '--guide-button-text': theme.colors.button.text
}

const cancel_reveal = () => {
  clearTimeout(reveal_timer)
  reveal_timer = null
}
const dismiss = () => {
  cancel_reveal()
  is_visible.value = false
  was_presented = true
  mark_profile_guide_presented(props.context)
}

watch(() => props.eligible, (eligible) => {
  cancel_reveal()
  if (!eligible) {
    is_visible.value = false
    return
  }
  if (was_presented || has_presented_profile_guide(props.context)) return
  // Let the sheet finish entering before drawing attention to its avatar.
  reveal_timer = setTimeout(() => {
    reveal_timer = null
    if (!props.eligible || has_presented_profile_guide(props.context)) return
    is_visible.value = true
    was_presented = true
    mark_profile_guide_presented(props.context)
  }, 700)
}, { immediate: true })

onBeforeUnmount(cancel_reveal)
defineExpose({ dismiss })
</script>

<style scoped lang="scss">
.profile-guide {
  max-height: 160px;
  overflow: hidden;
}
.profile-guide__card {
  position: relative;
  display: flex;
  margin: 12px 1px 2px;
  padding: 10px 12px;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--guide-border);
  border-radius: 18px;
  background: linear-gradient(110deg, rgba(206, 150, 255, .11), rgba(255, 157, 203, .04)), var(--guide-background);
  box-shadow: 0 4px 18px rgba(14, 10, 32, .16), inset 0 1px rgba(255, 255, 255, .04);
}
.profile-guide__card::before {
  position: absolute;
  top: -6px;
  left: 16px;
  width: 10px;
  height: 10px;
  border-top: 1px solid var(--guide-border);
  border-left: 1px solid var(--guide-border);
  background: var(--guide-background);
  content: '';
  transform: rotate(45deg);
}
.profile-guide__copy { min-width: 0; flex: 1; }
.profile-guide__heading {
  display: flex;
  gap: 7px;
  align-items: center;
  color: var(--guide-title);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}
.profile-guide__spark { color: var(--guide-accent); animation: profile-guide-glow 1.8s ease-in-out 3; }
.profile-guide__description {
  display: block;
  margin-top: 4px;
  color: var(--guide-copy);
  font-size: 12px;
  line-height: 1.5;
}
.profile-guide__done {
  display: flex;
  box-sizing: border-box;
  min-width: 58px;
  min-height: 44px;
  margin: 0;
  padding: 0 12px;
  align-items: center;
  justify-content: center;
  flex: none;
  border: 0;
  border-radius: 22px;
  background: var(--guide-button);
  color: var(--guide-button-text);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}
.profile-guide__done::after { border: 0; }
.profile-guide__done--pressed { opacity: .7; }
.profile-guide__done:focus-visible { outline: 2px solid var(--guide-title); outline-offset: 3px; }
.profile-guide-reveal-enter-active,
.profile-guide-reveal-leave-active {
  transition: max-height .28s ease, opacity .2s ease, transform .28s ease;
}
.profile-guide-reveal-enter-from,
.profile-guide-reveal-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-5px);
}
@keyframes profile-guide-glow {
  0%, 100% { opacity: .65; }
  50% { opacity: 1; text-shadow: 0 0 10px rgba(255, 211, 174, .5); }
}
@media (prefers-reduced-motion: reduce) {
  .profile-guide__spark { animation: none; }
  .profile-guide-reveal-enter-active,
  .profile-guide-reveal-leave-active { transition: none; }
}
</style>
