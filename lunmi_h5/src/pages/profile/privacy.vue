<template>
  <PageTransition ref="page_transition" class="privacy-page" :style="theme_style">
    <!-- AgreementTopBar 接管顶部安全区，因此不渲染 TopSafeArea。 -->
    <AgreementTopBar :title="$t('Privacy Policy')" @back="go_back" />
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-scroll__inner">
        <view v-for="section in PRIVACY_SECTIONS" :key="section.title" class="privacy-card">
          <text class="privacy-card__title" :class="{ 'privacy-card__title--accent': section.accent }">{{ $t(section.title) }}</text>
          <text class="privacy-card__copy">{{ $t(section.content) }}</text>
        </view>
      </view>
    </scroll-view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import AgreementTopBar from '@/components/AgreementTopBar.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import { PRIVACY_SECTIONS, read_privacy_source } from '@/utils/privacyPolicyPresentation'

const page_transition = ref(null)
const source_page = ref(read_privacy_source())
const is_leaving = ref(false)
let allow_route_back = false

const theme_style = {
  '--agreement-title-color': theme.colors.text.title,
  '--agreement-accent-color': theme.colors.status.coin,
  '--privacy-background': theme.colors.page.background,
  '--privacy-title': theme.colors.text.title,
  '--privacy-copy': theme.colors.text.secondary,
  '--privacy-card': theme.colors.surface.card,
  '--privacy-border': theme.colors.surface.border,
  '--privacy-accent': theme.colors.status.coin,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const go_back = () => {
  if (is_leaving.value) return
  is_leaving.value = true
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: source_page.value })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: source_page.value,
    fail: () => {
      is_leaving.value = false
    }
  })
  if (!started) is_leaving.value = false
}

// feedback_mode: immediate — the policy text is static. api.md has no legal-document endpoint.
onLoad((query = {}) => {
  source_page.value = read_privacy_source(query)
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})
</script>

<style scoped lang="scss">
.privacy-page {
  background: var(--privacy-background);
  color: var(--privacy-title);
}

.content-scroll {
  min-height: 0;
  flex: 1;
}

.content-scroll__inner {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12rpx 32rpx 48rpx;
  gap: 20rpx;
}

.privacy-card {
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  padding: 32rpx;
  border: 1px solid var(--privacy-border);
  border-radius: 32rpx;
  background: var(--privacy-card);
  gap: 16rpx;
  flex: none;
}

.privacy-card__title {
  color: var(--privacy-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 40rpx;
}

.privacy-card__title--accent {
  color: var(--privacy-accent);
}

.privacy-card__copy {
  color: var(--privacy-copy);
  font-size: 28rpx;
  font-weight: 500;
  line-height: 44rpx;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
