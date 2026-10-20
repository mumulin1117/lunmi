import { createVNode, render } from 'vue'

// uni-app H5 replaces App's template with its router layout. Shared UI uses
// the same app context (router, Pinia and components), outside the page lifecycle.
export const mount_global_ui = (component, app_context) => {
  if (typeof document === 'undefined' || !app_context) return () => {}
  const host = document.createElement('div')
  host.setAttribute('data-global-ui', 'main-tab-bar')
  document.body.appendChild(host)
  const vnode = createVNode(component)
  vnode.appContext = app_context
  render(vnode, host)
  return () => {
    render(null, host)
    host.remove()
  }
}
