<template>
  <PageTransition ref="page_transition" class="records-page" :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <view class="records-header">
        <image class="back-button" role="button" :aria-label="$t('Go back')" @click="go_back" src="/static/icon/seconde_page_back.png" mode="aspectFit" />
        <view class="header-copy">
          <text class="header-title">{{ $t('Authorization records') }}</text>
          <view class="header-line" />
        </view>
      </view>
      <scroll-view class="records-scroll" scroll-y :show-scrollbar="false">
        <view class="records-scroll__inner">
          <view v-if="load_error" class="records-error" role="alert">
            <text>{{ $t(load_error) }}</text>
            <view role="button" @click="load_records">{{ $t('Try again') }}</view>
          </view>
          <view v-for="row in rows" :key="row.key" class="record-card">
            <image class="record-card__icon" :src="row.icon" mode="aspectFit" />
            <view class="record-card__copy">
              <text class="record-card__title">{{ $t(row.title) }}</text>
              <text class="record-card__status">{{ $t(permission_status_label(row.state)) }}</text>
            </view>
            <view
              class="record-switch"
              :class="{
              'record-switch--on': row.granted,
              'record-switch--disabled': row.state === 'requesting'
              }"
              role="switch"
              :aria-label="$t(row.title)"
              :aria-checked="row.granted"
              :aria-disabled="row.state === 'requesting'"
              :aria-busy="row.state === 'requesting'"
              @click="toggle_permission(row.key)"
            >
              <view class="record-switch__knob" />
            </view>
          </view>
          <text v-if="action_message" class="records-inline-error" role="alert">{{ $t(action_message) }}</text>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
    <PermissionNoticeDialog
      :visible="Boolean(notice)"
      :title="$t(notice?.title || '')"
      :message="$t(notice?.message || '')"
      @close="close_notice"
    />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad, onShow } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PermissionNoticeDialog from '@/components/PermissionNoticeDialog.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import { ensure_ios_permission } from '@/utils/iosPermissionBridge'
import {
  PERMISSION_RECORD_ROWS,
  next_permission_state,
  permission_notice_copy,
  permission_status_label,
  read_permission_source
} from '@/utils/permissionRecordsPresentation'
import { storeGlobal } from '@/stores/store'

const page_transition = ref(null)
const source_page = ref(read_permission_source({}))
const rows = ref([])
const load_error = ref('')
const action_message = ref('')
const notice = ref(null)
const is_page_active = ref(true)
const is_leaving = ref(false)
let allow_route_back = false

const theme_style = {
  '--records-background': theme.colors.page.background,
  '--records-title': theme.colors.text.title,
  '--records-copy': theme.colors.text.secondary,
  '--records-card': theme.colors.surface.card,
  '--records-border': theme.colors.surface.border,
  '--records-back': theme.colors.surface.deep,
  '--records-line': theme.colors.lantern_detail.title_line,
  '--records-line-shadow': theme.colors.lantern_detail.title_line_shadow,
  '--records-error': theme.colors.status.danger,
  '--records-switch-off': theme.colors.button_change.default.background,
  '--records-switch-on': theme.colors.button_change.active.background,
  '--records-knob': theme.colors.button_change.active.text,
  background: theme.colors.page.background
}

const load_records = () => {
  if (!is_page_active.value) return
  try {
    const store = storeGlobal()
    const requesting = new Set(rows.value.filter((row) => row.state === 'requesting').map((row) => row.key))
    rows.value = PERMISSION_RECORD_ROWS.map((row) => {
      const current = rows.value.find((item) => item.key === row.key)
      if (requesting.has(row.key) && current) return current
      const granted = Boolean(store.getAuthRecord(row.key))
      return { ...row, granted, state: granted ? 'granted' : 'not_granted' }
    })
    load_error.value = ''
  } catch {
    load_error.value = 'Unable to read permission records.'
  }
}

const apply_result = (key, result, turning_off) => {
  const row = rows.value.find((item) => item.key === key)
  if (!row) return
  const next = next_permission_state(result)
  if (turning_off && next.granted === true) {
    rows.value = rows.value.map((item) => (item.key === key ? { ...item, granted: true, state: 'granted' } : item))
    notice.value = permission_notice_copy(row.title, 'kept')
    return
  }
  if (next.state === 'failure') {
    rows.value = rows.value.map((item) => (item.key === key ? { ...item, state: 'failure' } : item))
    action_message.value = result?.error || `Unable to check ${row.title}.`
    return
  }
  rows.value = rows.value.map((item) => (
    item.key === key ? { ...item, granted: next.granted, state: next.state } : item
  ))
  if (next.notice) notice.value = permission_notice_copy(row.title, next.notice)
}

// feedback_mode: control_pending — only the selected permission waits on the host.
const toggle_permission = async (key) => {
  const row = rows.value.find((item) => item.key === key)
  if (!row || row.state === 'requesting' || is_leaving.value) return
  action_message.value = ''
  const turning_off = row.granted === true
  rows.value = rows.value.map((item) => (item.key === key ? { ...item, state: 'requesting' } : item))
  let result
  try {
    result = await ensure_ios_permission(row.bridge, { reason: row.copy })
  } catch (error) {
    result = { permission_status: 'unavailable', unavailable: true, error: error?.message || '' }
  }
  if (!is_page_active.value) return
  apply_result(key, result, turning_off)
}

const close_notice = () => {
  notice.value = null
}

const go_back = () => {
  if (!is_page_active.value || is_leaving.value) return
  if (notice.value) {
    notice.value = null
    return
  }
  if (rows.value.some((row) => row.state === 'requesting')) return
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
      action_message.value = 'Unable to go back.'
    }
    return
  }
  const started = page_transition.value?.navigate_relaunch({
    url: source_page.value,
    fail: () => {
      is_leaving.value = false
      action_message.value = 'Unable to go back.'
    }
  })
  if (!started) {
    is_leaving.value = false
    action_message.value = 'Unable to go back.'
  }
}

onLoad((query = {}) => {
  source_page.value = read_permission_source(query)
})

onShow(() => {
  load_records()
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

.records-page {
  background: var(--records-background);
}

.page-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.records-header {
  display: flex;
  align-items: center;
  padding: 12rpx 32rpx 8rpx;
}

.back-button {
  @include page_back.button;
}

.header-copy {
  min-width: 0;
  margin-left: 20rpx;
}

.header-title {
  color: var(--records-title);
  font-size: 40rpx;
  font-weight: 800;
}

.header-line {
  width: 72rpx;
  height: 6rpx;
  margin-top: 8rpx;
  border-radius: 6rpx;
  background: var(--records-line);
  box-shadow: 0 0 12rpx var(--records-line-shadow);
}

.records-scroll {
  min-height: 0;
  flex: 1;
}

.records-scroll__inner {
  padding: 24rpx 32rpx 40rpx;
}

.record-card {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 28rpx;
  border: 1px solid var(--records-border);
  border-radius: 28rpx;
  background: var(--records-card);
}

.record-card__icon {
  width: 48rpx;
  height: 48rpx;
  flex: none;
}

.record-card__copy {
  display: flex;
  min-width: 0;
  margin: 0 20rpx;
  flex: 1;
  flex-direction: column;
}

.record-card__title {
  color: var(--records-title);
  font-size: 30rpx;
  font-weight: 800;
}

.record-card__status {
  margin-top: 6rpx;
  color: var(--records-copy);
  font-size: 24rpx;
}

.record-switch {
  position: relative;
  width: 84rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: var(--records-switch-off);
  flex: none;
}

.record-switch--on {
  background: var(--records-switch-on);
}

.record-switch--disabled {
  opacity: .5;
  pointer-events: none;
}

.record-switch__knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--records-knob);
}

.record-switch--on .record-switch__knob {
  left: 40rpx;
}

.records-error,
.records-inline-error {
  color: var(--records-error);
  font-size: 26rpx;
  line-height: 36rpx;
}

.records-error {
  margin-bottom: 24rpx;
}

.records-error view {
  margin-top: 12rpx;
  font-weight: 800;
}

.records-inline-error {
  display: block;
}
</style>
