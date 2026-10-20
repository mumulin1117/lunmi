const normalize_text = (value) => `${value ?? ''}`.trim()

export const map_edit_profile = (data = {}) => ({
  username: normalize_text(data.userName),
  city: normalize_text(data.userLocation),
  bio: normalize_text(data.userBrief),
  email: normalize_text(data.userEmail).toLowerCase(),
  avatar_url: normalize_text(data.userImgUrl)
})

export const validate_profile_username = (username = '') => (
  normalize_text(username).length >= 2 ? '' : 'Username must contain at least 2 characters.'
)

export const build_profile_update_params = (form = {}) => ({
  userName: normalize_text(form.username),
  userEmail: normalize_text(form.email).toLowerCase(),
  userBrief: normalize_text(form.bio),
  userLocation: normalize_text(form.city),
  userImgUrl: normalize_text(form.avatar_url)
})
