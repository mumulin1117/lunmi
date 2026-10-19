import { getCurrentInstance, onBeforeUnmount, onMounted, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'

// Decorative CSS and canvas animations share the owning page's visibility policy.
export const use_ambient_activity = (on_change, on_dispose) => {
  const is_active = ref(false)
  const is_visible = ref(false)
  const is_reduced = ref(false)
  let mounted = false
  let page_visible = true
  let preference = null
  let disposed = false

  const update = () => {
    if (!mounted) return
    is_reduced.value = preference?.matches === true
    is_visible.value = page_visible && !document.hidden
    is_active.value = is_visible.value && !is_reduced.value
    on_change?.({ active: is_active.value, reduced: is_reduced.value })
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    mounted = false
    is_active.value = false
    is_visible.value = false
    on_change?.({ active: false, reduced: is_reduced.value })
    preference?.removeEventListener('change', update)
    document.removeEventListener('visibilitychange', update)
    on_dispose?.()
  }

  let page_instance = getCurrentInstance()
  while (page_instance?.parent && page_instance.proxy?.$mpType !== 'page') page_instance = page_instance.parent
  onShow(() => {
    page_visible = true;
    update()
  }, page_instance)
  onHide(() => {
    page_visible = false;
    update()
  }, page_instance)
  // H5 can retain a Vue page instance after uni-app removes it from its route stack.
  onUnload(dispose, page_instance)
  onMounted(() => {
    mounted = true
    preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    preference.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    update()
  })
  onBeforeUnmount(dispose)

  return { is_active, is_reduced, is_visible }
}
