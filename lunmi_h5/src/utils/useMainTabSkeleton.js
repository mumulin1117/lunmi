import { ref } from 'vue'

export const MAIN_TAB_SKELETON_ROUTES = Object.freeze([
  'pages/discover/index',
  'pages/messages/index',
  'pages/videos/index',
  'pages/profile/index'
])
// 保留兼容导出；骨架屏必须由真实 API 请求状态驱动，不再使用计时器或全局一次性标记。
export const prepare_main_tab_skeleton = () => {}

export const use_main_tab_skeleton = () => {
  const is_main_tab_loading = ref(false)
  return { is_main_tab_loading }
}
