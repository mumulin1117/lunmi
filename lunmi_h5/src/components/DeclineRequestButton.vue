<template>
  <button
    class="decline-request"
    :style="button_style"
    :disabled="disabled"
    :aria-label="$t('Decline request')"
    @click.stop="$emit('decline')"
  >
    <span class="decline-request__cross" aria-hidden="true" />
    <text>{{ $t('Decline') }}</text>
  </button>
</template>

<script setup>
import theme from '@/config/theme.json'

defineProps({ disabled: { type: Boolean, default: false } })
defineEmits(['decline'])
const button_style = {
  '--decline-text': theme.colors.text.title,
  '--decline-border': theme.colors.surface.border
}
</script>

<style scoped lang="scss">
.decline-request {
  display: inline-flex;
  box-sizing: border-box;
  min-width: 82px;
  min-height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0;
  padding: 0 13px;
  border: 1px solid var(--decline-border);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 183, 213, 0.13), rgba(182, 148, 238, 0.1));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: var(--decline-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  transition: transform 160ms ease, background 160ms ease;
}

.decline-request::after { border: none; }
.decline-request:active { transform: scale(0.96); }
.decline-request:focus-visible { outline: 2px solid #e7b5ed; outline-offset: 3px; }
.decline-request[disabled] { opacity: 0.45; }
.decline-request__cross { position: relative; width: 12px; height: 12px; color: #efb5d6; }
.decline-request__cross::before,
.decline-request__cross::after {
  position: absolute;
  top: 5px;
  left: 0;
  width: 12px;
  height: 1.5px;
  border-radius: 2px;
  background: currentColor;
  content: '';
  transform: rotate(45deg);
}
.decline-request__cross::after { transform: rotate(-45deg); }
@media (prefers-reduced-motion: reduce) { .decline-request { transition: none; } }
</style>
