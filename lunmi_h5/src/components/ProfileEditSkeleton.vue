<template>
  <view class="profile-edit-skeleton" aria-hidden="true">
    <view class="profile-edit-skeleton__identity" />
    <view class="profile-edit-skeleton__field" />
    <view class="profile-edit-skeleton__field" />
    <view class="profile-edit-skeleton__bio" />
  </view>
</template>

<style scoped lang="scss">
.profile-edit-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.profile-edit-skeleton__identity,
.profile-edit-skeleton__field,
.profile-edit-skeleton__bio {
  border-radius: 28rpx;
  background: var(--edit-skeleton);
}

.profile-edit-skeleton__identity,
.profile-edit-skeleton__field {
  height: 128rpx;
}

.profile-edit-skeleton__bio {
  height: 220rpx;
}
</style>
