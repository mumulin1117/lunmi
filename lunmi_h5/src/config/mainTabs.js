export const MAIN_TABS = Object.freeze([
  Object.freeze({
    key: 'home',
    label: 'Home',
    path: 'pages/discover/index'
  }),
  Object.freeze({
    key: 'messages',
    label: 'Messages',
    path: 'pages/messages/index'
  }),
  Object.freeze({
    key: 'videos',
    label: 'Videos',
    path: 'pages/videos/index'
  }),
  Object.freeze({
    key: 'profile',
    label: 'Profile',
    path: 'pages/profile/index'
  })
])

export const MAIN_TAB_ROUTES = Object.freeze(MAIN_TABS.map((tab) => tab.path))

export const normalize_page_route = (route = '') => (
  `${route || ''}`.split('?')[0].replace(/^\//, '')
)

export const is_main_tab_route = (route) => MAIN_TAB_ROUTES.includes(normalize_page_route(route))
