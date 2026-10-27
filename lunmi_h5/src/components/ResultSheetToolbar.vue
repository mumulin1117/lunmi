<template>
  <view class="result-toolbar">
    <view class="result-toolbar__handle" aria-hidden="true" />
    <button
      class="result-toolbar__close"
      :aria-label="$t('Close')"
      hover-class="result-toolbar__close--pressed"
      @click.stop="$emit('close')"
    >
      <view class="result-toolbar__cross" aria-hidden="true" />
    </button>
  </view>
</template>

<script setup>
defineEmits(['close'])
</script>

<style scoped lang="scss">
.result-toolbar {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  padding: 0 12rpx;
  align-items: center;
  justify-content: flex-end;
  flex: none;
}

.result-toolbar__handle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 84rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: var(--dismiss-handle);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.result-toolbar__close {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  margin: 0;
  padding: 0;
  align-items: center;
  justify-content: center;
  overflow: visible;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--dismiss-ink);
  line-height: 1;
  -webkit-tap-highlight-color: transparent;
}

.result-toolbar__close::before {
  position: absolute;
  inset: 6px;
  border: 1px solid var(--dismiss-border);
  border-radius: inherit;
  background: var(--dismiss-fill);
  content: '';
}

.result-toolbar__close::after {
  border: 0;
}

.result-toolbar__cross {
  position: relative;
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.result-toolbar__cross::before,
.result-toolbar__cross::after {
  position: absolute;
  top: 7px;
  left: 0;
  width: 16px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  content: '';
  transform: rotate(45deg);
}

.result-toolbar__cross::after {
  transform: rotate(-45deg);
}

.result-toolbar__close:active,
.result-toolbar__close--pressed {
  opacity: .65;
}

.result-toolbar__close:focus-visible {
  outline: 2px solid var(--dismiss-ink);
  outline-offset: 1px;
}
</style>
