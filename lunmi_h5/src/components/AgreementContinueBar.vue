<template>
  <view class="agreement-continue-bar">
    <view class="agreement-document-links">
      <text class="agreement-consent__link" role="button" @click="emit('open-eula')">{{ $t('EULA') }}</text>
      <text class="agreement-consent__link" role="button" @click="emit('open-terms')">{{ $t('Terms of Service') }}</text>
      <text class="agreement-consent__link" role="button" @click="emit('open-privacy')">{{ $t('Privacy Policy') }}</text>
    </view>
    <view
      class="agreement-consent"
      role="checkbox"
      :aria-checked="agreed"
      @click="emit('toggle')"
    >
      <view class="agreement-consent__box" :class="{ 'agreement-consent__box--checked': agreed }">
        <image
          v-if="agreed"
          class="agreement-consent__check"
          src="/static/icon/login_terms_check.png"
          mode="aspectFit"
        />
      </view>
      <view class="agreement-consent__copy">
        <text class="agreement-consent__label">{{ $t('I agree to the EULA and Terms of Service.') }}</text>
      </view>
    </view>
    <text v-if="error" class="agreement-continue-bar__error">{{ $t(error) }}</text>
    <view class="agreement-continue-bar__button" role="button" @click="emit('continue')">
      <text class="agreement-continue-bar__label">{{ $t('Continue') }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  agreed: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['toggle', 'continue', 'open-eula', 'open-terms', 'open-privacy'])
</script>

<style scoped lang="scss">
.agreement-continue-bar {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  padding: 0 40rpx var(--page-safe-bottom);
  flex: none;
}

.agreement-consent {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.agreement-consent__box {
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--agreement-accent-color);
  border-radius: 14rpx;
  flex: none;
}

.agreement-consent__box--checked {
  background: var(--agreement-accent-color);
}

.agreement-consent__check {
  width: 28rpx;
  height: 28rpx;
}

.agreement-consent__copy {
  display: flex;
  align-items: center;
  min-width: 0;
}

.agreement-document-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 24rpx;
  margin-bottom: 20rpx;
}

.agreement-consent__label {
  color: var(--agreement-title-color);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
  margin-right: 10rpx;
}

.agreement-consent__link {
  color: var(--agreement-link-color);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 40rpx;
}

.agreement-continue-bar__error {
  display: block;
  margin-top: 12rpx;
  color: var(--agreement-warning-color);
  font-size: 24rpx;
  font-weight: 600;
  line-height: 34rpx;
}

.agreement-continue-bar__button {
  display: flex;
  height: 112rpx;
  align-items: center;
  justify-content: center;
  margin-top: 24rpx;
  border-radius: 999rpx;
  background: var(--agreement-button-background);
}

.agreement-continue-bar__label {
  color: var(--agreement-button-text);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 40rpx;
}
</style>
