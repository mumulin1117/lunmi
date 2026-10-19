<template>
  <PageTransition ref="page_transition" class="permission-page" :style="theme_style">
    <TopSafeArea />
    <PermissionRequestOverlay
      :visible="is_overlay_visible"
      :permission-key="permission_key"
      @update:visible="handle_overlay_visible"
      @granted="return_to_source"
      @denied="return_to_source"
    />
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import PermissionRequestOverlay from '@/components/PermissionRequestOverlay.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'

const HOME_PAGE_PATH = '/pages/home/index'

const page_transition = ref(null)
const permission_key = ref('')
const source_page = ref(HOME_PAGE_PATH)
const is_overlay_visible = ref(false)
const is_page_active = ref(true)
let allow_route_back = false

const theme_style = {
  '--page-background': theme.colors.page.background
}

const normalize_source_page = (value) => {
  let path = `${value || ''}`.trim()
  try {
    if (path.includes('%')) path = decodeURIComponent(path)
  } catch {
    path = `${value || ''}`.trim()
  }
  path = path.split('?')[0]
  if (!path.startsWith('/pages/') || path.includes('..')) return HOME_PAGE_PATH
  return path
}

const page_stack_length = () => {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  return pages.length
}

const return_to_source = () => {
  if (!is_page_active.value) return
  is_overlay_visible.value = false
  if (page_stack_length() > 1) {
    allow_route_back = true
    const started = page_transition.value?.navigate_back({
      complete: () => {
        allow_route_back = false
      },
      fail: () => {
        allow_route_back = false
      }
    })
    if (!started) allow_route_back = false
    return
  }
  page_transition.value?.navigate_relaunch({ url: source_page.value })
}

const handle_overlay_visible = (visible) => {
  is_overlay_visible.value = visible
  if (!visible) return_to_source()
}

onLoad((options) => {
  permission_key.value = `${options?.permission || ''}`
  source_page.value = normalize_source_page(options?.sourcePage)
  is_overlay_visible.value = true
})

onBackPress(() => {
  if (allow_route_back) return false
  if (is_overlay_visible.value) {
    is_overlay_visible.value = false
    return_to_source()
    return true
  }
  if (page_stack_length() > 1) return false
  page_transition.value?.navigate_relaunch({ url: source_page.value })
  return true
})

onBeforeUnmount(() => {
  is_page_active.value = false
})
</script>

<style scoped lang="scss">
.permission-page {
  background: var(--page-background);
}
</style>
