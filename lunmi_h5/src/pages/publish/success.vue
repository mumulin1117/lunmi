<template>
  <PageTransition ref="page_transition" class="published-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="published-header">
        <image class="back-button" role="button" :aria-label="$t('Back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Published') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content-scroll__inner">
          <image class="success-badge" src="/static/icon/create_post_success_right.png" mode="aspectFit" />
          <text class="transmitted">{{ $t('TRANSMITTED') }}</text>
          <text class="published-title">{{ $t('Published') }}</text>
          <image class="success-scene" src="/static/icon/create_post_success_middle_img.png" mode="aspectFill" />
        </view>
      </scroll-view>
      <text v-if="form_error" class="form-error" role="alert">{{ $t(form_error) }}</text>
      <view class="view-post" role="button" :aria-label="$t('View post')" @click="view_post">
        <text>{{ $t('View post') }}</text>
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import {
  build_published_detail_url,
  read_publish_return_page
} from '@/utils/publishSuccessPresentation.js'

const page_transition = ref(null)
const post_id = ref('')
const publish_source = ref('')
const return_page = ref('')
const form_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background,
  '--published-title': theme.colors.text.title,
  '--published-accent': theme.colors.status.info,
  '--published-copy': theme.colors.text.secondary,
  '--published-border': theme.colors.surface.border,
  '--published-header-surface': theme.colors.lantern_detail.header_surface,
  '--published-line': theme.colors.lantern_detail.title_line,
  '--published-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--published-button': theme.colors.button.primary,
  '--published-button-text': theme.colors.button.text,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  is_leaving.value = true
  const fallback = return_page.value
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
        is_leaving.value = false
        page_transition.value?.navigate_relaunch({ url: fallback })
      }
    })
    if (!started) {
      allow_route_back = false
      is_leaving.value = false
      page_transition.value?.navigate_relaunch({ url: fallback })
    }
    return
  }
  page_transition.value?.navigate_relaunch({ url: fallback })
}

const view_post = () => {
  if (is_leaving.value) return
  if (!post_id.value) {
    form_error.value = 'This post cannot be opened.'
    return
  }
  is_leaving.value = true
  page_transition.value?.navigate_forward({
    url: build_published_detail_url({
      post_id: post_id.value,
      source: publish_source.value,
      return_page: return_page.value
    }),
    fail: () => {
      is_leaving.value = false
      form_error.value = 'Post details are unavailable right now.'
    }
  })
}

onLoad((query) => {
  post_id.value = `${query?.dynamic_id || ''}`.trim()
  publish_source.value = `${query?.source || ''}`.trim()
  return_page.value = read_publish_return_page({
    source: publish_source.value,
    source_page: query?.sourcePage
  })
})

onBackPress(() => {
  if (allow_route_back) return false
  go_back()
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
})
</script>

<style scoped lang="scss">
@use '@/styles/page-back-button.scss' as page_back;

.published-page {
  background: var(--page-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.published-header {
  display: flex;
  height: 80rpx;
  flex: none;
  align-items: center;
  padding: 0 36rpx;
}

.back-button {
  @include page_back.button;
}

.header-copy {
  margin-left: 24rpx;
}

.header-title,
.published-title {
  display: block;
  color: var(--published-title);
  font-weight: 700;
}

.header-title {
  font-size: 42rpx;
  line-height: 42rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--published-line);
  box-shadow: 0 0 18rpx var(--published-line-shadow);
}

.content-scroll {
  min-height: 0;
  height: 0;
  flex: 1;
}

.content-scroll__inner {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  padding: 24rpx 36rpx 12rpx;
  flex-direction: column;
}

.success-badge {
  width: 220rpx;
  height: 220rpx;
}

.transmitted {
  margin-top: 48rpx;
  color: var(--published-accent);
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 6rpx;
}

.published-title {
  margin-top: 16rpx;
  font-size: 52rpx;
  line-height: 60rpx;
}

.success-scene {
  width: 100%;
  height: 220rpx;
  margin-top: 36rpx;
  border-radius: 28rpx;
}

.form-error {
  display: block;
  flex: none;
  margin: 0 36rpx 12rpx;
  color: var(--published-copy);
  font-size: 24rpx;
  line-height: 34rpx;
  text-align: center;
}

.view-post {
  display: flex;
  height: 108rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 12rpx 36rpx 28rpx;
  border-radius: 54rpx;
  background: var(--published-button);
}

.view-post text {
  color: var(--published-button-text);
  font-size: 32rpx;
  font-weight: 700;
}
</style>
