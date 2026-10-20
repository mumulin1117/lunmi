<template>
  <PageTransition ref="page_transition" class="wishing-page" :style="theme_style">
    <AmbientScene class="wishing-scene" scene="wish" />
    <LanternRitual kind="wish" :state="load_error ? 'error' : (wish_ready ? 'complete' : 'waiting')" :branch-level="branch_level" @complete="on_rise_end" />
    <view class="wishing-shade" aria-hidden="true" />
    <TopSafeArea />
    <view class="wishing-stage">
      <view class="wishing-pill" role="status" aria-live="polite">
        <view class="wishing-dot" />
        <text>{{ $t(wish_ready ? 'Rising...' : 'Publishing wish...') }}</text>
      </view>
      <view v-if="load_error" class="wishing-error" role="alert">
        <text class="wishing-error__copy">{{ $t(load_error) }}</text>
        <view class="wishing-error__retry" role="button" :aria-disabled="is_confirming" @click="confirm_wish">{{ $t('Try again') }}</view>
      </view>
      <view class="skip-button" role="button" :aria-label="$t('Skip')" @click="skip_rise">
        <text>{{ $t('Skip') }}</text>
        <image src="/static/icon/release_skip.png" mode="aspectFit" />
      </view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onUnload } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import { selectLmWishPage } from '@/api/wish'
import { storeGlobal } from '@/stores/store'
import AmbientScene from '@/components/AmbientScene.vue'
import LanternRitual from '@/components/LanternRitual.vue'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { remember_ritual, take_ritual } from '@/utils/ritualHandoff'
import { WISH_TREE_PATH, build_tree_published_url, read_wishing_query, wish_record_exists } from '@/utils/wishSheetPresentation'

const page_transition = ref(null)
const wish_id = ref('')
const branch_level = ref('mid')
const load_error = ref('')
const wish_ready = ref(false)
const animation_done = ref(false)
const is_page_active = ref(true)
const is_leaving = ref(false)
const is_confirming = ref(false)
let request_context = {}
let publish_record = null
let confirm_generation = 0

const theme_style = {
  '--wishing-shade': theme.colors.home.scene_shade,
  '--wishing-pill': theme.colors.tabbar.background,
  '--wishing-title': theme.colors.text.on_media,
  '--wishing-dot': theme.colors.status.info,
  '--wishing-error': theme.colors.surface.scrim_soft,
  '--wishing-retry': theme.colors.status.info,
  '--wishing-skip': theme.colors.surface.deep,
  '--wishing-skip-border': theme.colors.surface.border,
  '--wishing-skip-text': theme.colors.text.on_media,
  background: theme.colors.page.background
}

const return_to_tree = (published) => {
  if (!is_page_active.value || is_leaving.value) return
  const confirmed = Boolean(published && wish_ready.value && publish_record
    && publish_record.user_id === `${storeGlobal().userId}`)
  is_leaving.value = true
  request_context.cancel?.()
  if (confirmed) remember_ritual('wish', publish_record.user_id, wish_id.value, branch_level.value)
  const fail = () => {
    is_leaving.value = false
    load_error.value = 'Unable to return to the wish tree.'
  }
  const started = page_transition.value?.navigate_relaunch({
    url: confirmed ? build_tree_published_url() : WISH_TREE_PATH,
    immediate: true,
    fail
  })
  if (!started) fail()
}

const on_rise_end = () => {
  if (!wish_ready.value || animation_done.value || !is_page_active.value || is_leaving.value) return
  animation_done.value = true
  return_to_tree(true)
}
const skip_rise = () => return_to_tree(wish_ready.value)

const confirm_wish = async () => {
  if (!is_page_active.value || is_leaving.value || is_confirming.value) return
  if (!wish_id.value || !publish_record || publish_record.user_id !== `${storeGlobal().userId}`) {
    load_error.value = 'This wish cannot be opened.'
    return
  }
  const generation = ++confirm_generation
  load_error.value = ''
  wish_ready.value = false
  animation_done.value = false
  is_confirming.value = true
  request_context.cancel?.()
  request_context = {}
  try {
    const result = await selectLmWishPage({ wishId: wish_id.value, current: 1, size: 1 }, request_context)
    if (!is_page_active.value || is_leaving.value || generation !== confirm_generation
      || publish_record.user_id !== `${storeGlobal().userId}`) return
    if (!result?.success) {
      load_error.value = result?.error || 'Unable to confirm this wish.'
      return
    }
    if (!wish_record_exists(result.data, wish_id.value)) {
      load_error.value = 'This wish is no longer available.'
      return
    }
    wish_ready.value = true
  } catch (error) {
    if (is_page_active.value && !is_leaving.value && generation === confirm_generation) {
      load_error.value = error?.message || 'Unable to confirm this wish.'
    }
  } finally {
    if (generation === confirm_generation) is_confirming.value = false
  }
}

onLoad((query = {}) => {
  wish_id.value = read_wishing_query(query).wish_id
  publish_record = take_ritual('wish', storeGlobal().userId, wish_id.value)
  branch_level.value = publish_record?.branch_level || 'mid'
  void confirm_wish()
})
onBackPress(() => {
  skip_rise();
  return true
})
const dispose = () => {
  is_page_active.value = false
  confirm_generation += 1
  request_context.cancel?.()
}
onUnload(dispose)
onBeforeUnmount(dispose)
</script>

<style scoped lang="scss">
.wishing-page {
  position: relative;
  background: var(--wishing-shade);
}

.wishing-scene {
  position: absolute;
  z-index: 0;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.wishing-shade {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: var(--wishing-shade);
  opacity: 0.12;
  pointer-events: none;
}

.wishing-stage {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 34rpx 32rpx;
}

.wishing-pill {
  display: flex;
  height: 72rpx;
  align-items: center;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--wishing-pill);
  color: var(--wishing-title);
  font-size: 28rpx;
  font-weight: 700;
}

.wishing-dot {
  width: 16rpx;
  height: 16rpx;
  margin-right: 16rpx;
  border-radius: 50%;
  background: var(--wishing-dot);
}

.wishing-error {
  display: flex;
  width: 100%;
  margin-top: 48rpx;
  padding: 28rpx 32rpx;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: var(--wishing-error);
}

.wishing-error__copy {
  min-width: 0;
  flex: 1;
  color: var(--wishing-title);
  font-size: 24rpx;
  line-height: 1.4;
}

.wishing-error__retry {
  margin-left: 24rpx;
  color: var(--wishing-retry);
  font-size: 24rpx;
  font-weight: 700;
}

.skip-button {
  display: flex;
  width: 162rpx;
  height: 81rpx;
  margin-top: auto;
  margin-left: auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wishing-skip-border);
  border-radius: 999rpx;
  background: var(--wishing-skip);
  color: var(--wishing-skip-text);
  font-size: 26rpx;
  font-weight: 700;
}

.skip-button image {
  width: 28rpx;
  height: 28rpx;
  margin-left: 10rpx;
}
</style>
