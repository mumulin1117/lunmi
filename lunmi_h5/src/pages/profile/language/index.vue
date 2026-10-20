<template>
  <PageTransition ref="page_transition" class="language-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="language-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Language') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <view class="language-list">
        <view
          v-for="item in APP_LANGUAGES"
          :key="item.code"
          class="language-card"
          :class="{ 'language-card--selected': item.code === selected_code }"
          role="radio"
          :aria-checked="item.code === selected_code"
          :aria-disabled="is_saving"
          :aria-busy="is_saving && item.code === pending_code"
          :aria-label="$t(item.english_name)"
          @click="choose_language(item.code)"
        >
          <view class="language-card__copy">
            <text class="language-card__native">{{ $t(item.english_name) }}</text>
            <text v-if="$t(item.english_name) !== item.native_name" class="language-card__english">{{ item.native_name }}</text>
          </view>
          <Check v-if="item.code === selected_code" class="language-card__check" aria-hidden="true" />
          <view v-else class="language-card__radio" aria-hidden="true" />
        </view>
        <text v-if="save_error" class="language-error" role="alert">{{ $t(save_error) }}</text>
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import { Check } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { APP_LANGUAGES } from '@/utils/languagePresentation'
import { app_language, save_app_language } from '@/utils/i18n'
import { SETTINGS_PAGE_PATH } from '@/utils/settingsPresentation'

const page_transition = ref(null)
const source_page = ref(SETTINGS_PAGE_PATH)
const selected_code = computed(() => app_language.value)
const is_saving = ref(false)
const pending_code = ref('')
const save_error = ref('')
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false

const theme_style = {
  '--language-background': theme.colors.page.background,
  '--language-title': theme.colors.text.title,
  '--language-copy': theme.colors.text.secondary,
  '--language-card': theme.colors.surface.card,
  '--language-border': theme.colors.surface.border,
  '--language-selected': theme.colors.status.coin,
  '--language-back': theme.colors.surface.deep,
  '--language-line': theme.colors.lantern_detail.title_line,
  '--language-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--language-error': theme.colors.status.danger,
  background: theme.colors.page.background
}

const read_source_page = (query = {}) => {
  let path = `${query.sourcePage || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${query.sourcePage || ''}`.trim()
  }
  if (!path.startsWith('/pages/') || path.includes('..')) return SETTINGS_PAGE_PATH
  return path
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value || is_saving.value) return
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
      save_error.value = 'Unable to go back.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: source_page.value,
    fail: () => {
      is_leaving.value = false
      save_error.value = 'Unable to go back.'
    }
  })
  if (!started) {
    is_leaving.value = false
    save_error.value = 'Unable to go back.'
  }
}

// feedback_mode: immediate — the language choice is a device preference, not a request.
const choose_language = async (code) => {
  if (is_leaving.value || is_saving.value) return
  save_error.value = ''
  is_saving.value = true
  pending_code.value = code
  const saved = await save_app_language(code)
  is_saving.value = false
  if (!is_page_active.value) return
  if (!saved) {
    save_error.value = 'Unable to save this language.'
    return
  }
  go_back()
}

onLoad((query = {}) => {
  source_page.value = read_source_page(query)
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

.language-page {
  background: var(--language-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.language-header {
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
  min-width: 0;
  margin-left: 20rpx;
}

.header-title {
  display: block;
  color: var(--language-title);
  font-size: 40rpx;
  font-weight: 700;
  line-height: 48rpx;
}

.header-line {
  width: 72rpx;
  height: 4rpx;
  margin-top: 8rpx;
  border-radius: 999rpx;
  background: var(--language-line);
  box-shadow: 0 0 18rpx var(--language-line-shadow);
}

.language-list {
  padding: 28rpx 36rpx 48rpx;
}

.language-card {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 28rpx;
  border: 2px solid var(--language-border);
  border-radius: 28rpx;
  background: var(--language-card);
}

.language-card:first-child {
  margin-top: 0;
}

.language-card--selected {
  border-color: var(--language-selected);
}

.language-card__copy {
  min-width: 0;
  flex: 1;
}

.language-card__native {
  display: block;
  color: var(--language-title);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 40rpx;
}

.language-card__english {
  display: block;
  margin-top: 6rpx;
  color: var(--language-copy);
  font-size: 24rpx;
  line-height: 32rpx;
}

.language-card__check {
  width: 36rpx;
  height: 36rpx;
  flex: none;
  color: var(--language-selected);
}

.language-card__radio {
  width: 36rpx;
  height: 36rpx;
  flex: none;
  box-sizing: border-box;
  border: 2px solid var(--language-border);
  border-radius: 50%;
}

.language-error {
  display: block;
  margin-top: 20rpx;
  color: var(--language-error);
  font-size: 24rpx;
  line-height: 34rpx;
}
</style>
