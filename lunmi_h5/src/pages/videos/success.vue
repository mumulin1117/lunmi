<template>
  <PageTransition ref="page_transition" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <SecondaryPageHeader :eyebrow="$t('VIDEOS')" :title="$t('Published')" />
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="success-content content-scroll__inner">
          <view class="success-icon">
            <Check />
          </view>
          <text class="success-title">{{ $t('Your post is live') }}</text>
          <text class="success-copy">{{ $t('Your') }} {{ $t(content_type === 'video' ? 'video' : 'photo') }} {{ $t('is now shared with the community.') }}</text>
          <view class="primary-button" role="button" @click="view_post">{{ $t('View post') }}</view>
          <view class="secondary-button" role="button" @click="go_to_videos">{{ $t('Back to videos') }}</view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { Check } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
const post_id = ref('')
const page_transition = ref(null)
const content_type = ref('image')
const theme_style = { '--page-background': theme.colors.page.background, '--title-color': theme.colors.text.title, '--secondary-color': theme.colors.text.secondary, '--accent-color': theme.colors.button.primary, '--accent-text-color': theme.colors.button.text, '--surface-color': theme.colors.button_change.default.background, background: theme.colors.page.background, color: theme.colors.text.title }
onLoad((query) => {
  post_id.value = query?.post_id || '';
  content_type.value = query?.content_type === 'video' ? 'video' : 'image'
})
const view_post = () => page_transition.value?.navigate_forward({
  url: `/pages/videos/detail?post_id=${encodeURIComponent(post_id.value)}&return_to_videos=videos_index`
})
const go_to_videos = () => page_transition.value?.navigate_relaunch({ url: '/pages/videos/index' })
</script>

<style scoped lang="scss">
.success-content {
  display: flex;
  min-height: calc(100% + 2rpx);
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  flex-direction: column;
  text-align: center;
}

.success-icon {
  display: flex;
  width: 144rpx;
  height: 144rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-color);
  color: var(--accent-text-color);
}

.success-icon > * {
  width: 74rpx;
  height: 74rpx;
}

.success-title {
  margin-top: 42rpx;
  font-size: 46rpx;
  font-weight: 900;
}

.success-copy {
  max-width: 510rpx;
  margin-top: 18rpx;
  color: var(--secondary-color);
  font-size: 27rpx;
  line-height: 1.5;
}

.primary-button,
.secondary-button {
  display: flex;
  width: 100%;
  max-width: 560rpx;
  height: 98rpx;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 98rpx;
  text-align: center;
}

.primary-button {
  margin-top: 56rpx;
  background: var(--accent-color);
  color: var(--accent-text-color);
}

.secondary-button {
  margin-top: 16rpx;
  background: var(--surface-color);
  color: var(--title-color);
}
</style>
