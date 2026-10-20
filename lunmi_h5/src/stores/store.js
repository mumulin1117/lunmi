import { defineStore } from 'pinia'
import { API_BUNDLE_ID } from '@/config/api'
import { clear_login_session, read_login_session, write_login_session } from '@/utils/loginSession'
import { read_permission_record, write_permission_record } from '@/utils/permissionStorage'

const AUTH_RECORD_KEYS = Object.freeze(['microphone', 'camera', 'location', 'album'])

export const storeGlobal = defineStore('storeGlobal', {
  state: () => ({
    // 应用信息
    bundleId: API_BUNDLE_ID,
    // Token
    token: '',
    // 是否登录
    isLogin: false,
    // 用户信息
    userInfo: {},
    // 用户授权记录
    authRecord: read_permission_record(),
    // 用户余额
    balance: 0,
  }),

  getters: {
    /**
     * 是否有 Token
     */
    hasToken: (state) => {
      return !!state.token
    },
    /**
     * 获取用户 ID
     */
    userId: (state) => {
      return state.userInfo?.userId || null
    },
    hasAuthPermission: (state) => (permission) => AUTH_RECORD_KEYS.includes(permission)
      && Boolean(state.authRecord?.[permission]),
  },

  actions: {
    /**
     * 设置 Token
     */
    setToken(token) {
      this.token = token || ''
    },
    /**
     * 获取 Token
     */
    getToken() {
      return this.token
    },

    /**
     * 清除 Token
     */
    clearToken() {
      this.token = ''
    },

    /**
     * 设置登录状态
     */
    setLoginStatus(status) {
      this.isLogin = Boolean(status)
    },

    persistLoginSession() {
      write_login_session({
        token: this.token,
        isLogin: this.isLogin,
        userInfo: this.userInfo
      })
    },

    /**
     * 登录
     */
    login(token, userInfo = {}) {
      this.setToken(token)
      this.setUserInfo(userInfo)
      this.setBalance(userInfo?.userBalance || 0)
      this.setLoginStatus(true)
      this.persistLoginSession()
    },

    /**
     * 退出登录
     */
    logout() {
      this.clearToken()
      this.clearUserInfo()
      this.clearBalance()
      this.setLoginStatus(false)
      clear_login_session()
    },
    /**
     * 设置完整用户信息
     */
    setUserInfo(userInfo) {
      this.userInfo = userInfo || {}
    },

    /**
     * 更新部分用户信息
     *
     * 例如：
     * updateUserInfo({
     *   nickname: '张三'
     * })
     */
    updateUserInfo(userInfo) {
      this.userInfo = {
        ...this.userInfo,
        ...userInfo,
      }
      if (this.token) this.persistLoginSession()
    },

    /**
     * 清除用户信息
     */
    clearUserInfo() {
      this.userInfo = {}
    },
    /**
     * 设置余额
     */
    setBalance(balance) {
      this.balance = Number(balance) || 0
    },

    /**
     * 增加余额
     */
    addBalance(amount) {
      this.balance += Number(amount) || 0
    },

    /**
     * 扣减余额
     */
    subtractBalance(amount) {
      this.balance = Math.max(
        0,
        this.balance - (Number(amount) || 0)
      )
    },

    /**
     * 清除余额
     */
    clearBalance() {
      this.balance = 0
    },

    /**
     * 保存 iOS 回传的用户授权结果。
     */
    setAuthRecord(permission, granted) {
      if (!AUTH_RECORD_KEYS.includes(permission)) return false
      this.authRecord[permission] = Boolean(granted)
      write_permission_record(permission, granted)
      return true
    },

    getAuthRecord(permission) {
      return AUTH_RECORD_KEYS.includes(permission) && Boolean(this.authRecord?.[permission])
    },


    // =====================================================
    // 初始化
    // =====================================================

    /**
     * 根据当前状态判断登录状态
     *
     * 页面启动时可以调用
     */
    initLoginStatus() {
      const session = read_login_session()
      if (session?.token) {
        this.setToken(session.token)
        this.setUserInfo(session.userInfo)
        this.setBalance(session.userInfo?.userBalance || 0)
        this.setLoginStatus(true)
        return
      }
      this.isLogin = !!this.token
    },
  },
})
