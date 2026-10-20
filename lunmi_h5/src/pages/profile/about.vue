<template>
  <PageTransition :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <SecondaryPageHeader :title="$t('About')" />
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content content-scroll__inner">
          <image class="about-logo" src="/static/logo.png" mode="aspectFit" />
          <text class="about-name">{{ $t('common_template') }}</text>
          <text class="about-version">{{ $t('Version') }} {{ $t(app_version) }}</text>
          <text class="about-copy">{{ $t('A social space for sharing moments, chatting with friends, and keeping your account settings in one place.') }}</text>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'

const app_version = '0.1.0'
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--surface-color': theme.colors.surface.card_soft,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}
</script>

<style scoped lang="scss">
:deep(.header-copy) {
  position: absolute;
  right: 0;
  left: 0;
  align-items: center;
  pointer-events: none;
}

:deep(.header-title) {
  font-size: 36rpx;
  text-align: center;
}

:deep(.back-button) {
  z-index: 1;
}

.content {
  display: flex;
  align-items: center;
  padding: 48rpx 48rpx 72rpx;
  flex-direction: column;
}

.about-logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 40rpx;
  background: var(--surface-color);
}

.about-name {
  margin-top: 28rpx;
  font-size: 40rpx;
  font-weight: 800;
}

.about-version {
  margin-top: 12rpx;
  color: var(--secondary-color);
  font-size: 26rpx;
}

.about-copy {
  margin-top: 28rpx;
  color: var(--secondary-color);
  font-size: 28rpx;
  line-height: 42rpx;
  text-align: center;
}
</style>
