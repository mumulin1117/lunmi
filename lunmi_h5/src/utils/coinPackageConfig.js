export const COIN_PACKAGE_CONFIG_PATH = 'static/config/coin-packages.json'

const REQUIRED_PACKAGE_FIELDS = Object.freeze([
  'package_id',
  'product_id',
  'coin_count',
  'price_text',
  'coin_icon_url'
])

const resolve_config_url = () => {
  const config_url = new URL(COIN_PACKAGE_CONFIG_PATH, document.baseURI)
  config_url.searchParams.set('runtime', `${Date.now()}`)
  return config_url.toString()
}

const normalize_coin_package_config = (payload) => {
  const coin_packages = payload?.coin_packages
  if (!Array.isArray(coin_packages) || !coin_packages.length) {
    throw new Error('Coin packages are unavailable.')
  }

  const package_ids = new Set()
  const product_ids = new Set()
  const normalized_packages = coin_packages.map((coin_package) => {
    const missing_field = REQUIRED_PACKAGE_FIELDS.find((field) => (
      coin_package?.[field] === undefined
      || coin_package?.[field] === null
      || coin_package?.[field] === ''
    ))
    const coin_count = Number(coin_package?.coin_count)
    const price_amount = Number(coin_package?.price_amount)
    if (missing_field || !Number.isSafeInteger(coin_count) || coin_count <= 0 || !Number.isFinite(price_amount) || price_amount <= 0) {
      throw new Error('Coin package configuration is invalid.')
    }
    if (package_ids.has(coin_package.package_id) || product_ids.has(coin_package.product_id)) {
      throw new Error('Coin package configuration contains duplicate identifiers.')
    }

    package_ids.add(coin_package.package_id)
    product_ids.add(coin_package.product_id)
    return {
      ...coin_package,
      coin_count,
      price_amount
    }
  })

  return {
    version: Number(payload.version || 0),
    coin_packages: normalized_packages.sort((left, right) => left.price_amount - right.price_amount)
  }
}

export const load_coin_package_config = () => new Promise((resolve, reject) => {
  uni.request({
    url: resolve_config_url(),
    method: 'GET',
    header: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    },
    success: (response) => {
      try {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw new Error('Unable to load coin packages.')
        }
        const payload = typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data
        resolve(normalize_coin_package_config(payload))
      } catch (error) {
        reject(error)
      }
    },
    fail: () => reject(new Error('Unable to load coin packages.'))
  })
})
