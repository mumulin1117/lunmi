<template>
  <PageTransition :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <SecondaryPageHeader :eyebrow="$t('YOUR PULSE')" :title="$t('All activity')" />
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content content-scroll__inner">
          <view class="hero">
            <text class="hero-value">{{ $t(activities.length) }}</text>
            <text class="hero-label">{{ $t('new moments this week') }}</text>
          </view>
          <DiscoverDataLoading v-if="is_loading" />
          <view v-else>
            <view v-for="item in activities" :key="item.activity_id" class="activity-card">
              <view class="activity-dot" :class="`activity-dot--${item.color}`" />
              <view class="activity-copy">
                <text class="activity-title">{{ $t(item.title) }}</text>
                <text class="activity-caption">{{ item.caption }}</text>
              </view>
              <text class="activity-time">{{ $t(item.time) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    <BottomSafeArea />
  </PageTransition>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import theme from '@/config/theme.json'
import BottomSafeArea from '@/components/BottomSafeArea.vue'
import PageTransition from '@/components/PageTransition.vue'
import SecondaryPageHeader from '@/components/SecondaryPageHeader.vue'
import TopSafeArea from '@/components/TopSafeArea.vue'
import DiscoverDataLoading from '@/components/DiscoverDataLoading.vue'
import { selectDynamicList } from '@/api/dynamic'
const activities = ref([])
const is_loading = ref(true)
onMounted(async () => {
  const result = await selectDynamicList({})
  if (result?.success) {
    const records = Array.isArray(result.data?.records) ? result.data.records : Array.isArray(result.data) ? result.data : []
    activities.value = records.slice(0, 20).map((item, index) => ({
      activity_id: `${item.dynamicId || index}`,
      title: item.dynamicContent || 'A new post was shared',
      caption: item.userName || 'Community update',
      time: item.createDate || '',
      color: index % 2 ? 'info' : 'success'
    }))
  }
  is_loading.value = false
})
const theme_style = { '--page-background': theme.colors.page.background, '--title-color': theme.colors.text.title, '--secondary-color': theme.colors.text.secondary, '--accent-color': theme.colors.button.primary, '--surface-color': theme.colors.surface.card_soft, '--success-color': theme.colors.status.success, '--info-color': theme.colors.status.info, '--danger-color': theme.colors.status.danger, '--coin-color': theme.colors.status.coin, background: theme.colors.page.background, color: theme.colors.text.title }
</script>

<style scoped lang="scss">
.content {
  padding: 26rpx 40rpx 72rpx;
}

.hero {
  padding: 38rpx;
  border-radius: 34rpx;
  background: var(--surface-color);
}

.hero-value {
  display: block;
  color: var(--accent-color);
  font-size: 72rpx;
  font-weight: 900;
}

.hero-label {
  color: var(--secondary-color);
  font-size: 26rpx;
}

.activity-card {
  display: flex;
  min-height: 116rpx;
  margin-top: 20rpx;
  align-items: center;
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: var(--surface-color);
}

.activity-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 10rpx;
}

.activity-dot--success {
  background: var(--success-color);
}

.activity-dot--info {
  background: var(--info-color);
}

.activity-dot--danger {
  background: var(--danger-color);
}

.activity-dot--coin {
  background: var(--coin-color);
}

.activity-copy {
  display: flex;
  margin-left: 20rpx;
  flex: 1;
  flex-direction: column;
}

.activity-title {
  font-size: 27rpx;
  font-weight: 750;
}

.activity-caption {
  margin-top: 8rpx;
  color: var(--secondary-color);
  font-size: 22rpx;
}

.activity-time {
  color: var(--secondary-color);
  font-size: 20rpx;
}
</style>
