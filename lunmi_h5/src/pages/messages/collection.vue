<template>
  <PageTransition :style="theme_style">
    <TopSafeArea />
    <view class="page-content">
      <SecondaryPageHeader  :title="$t('Things I want to remember')" />
      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view class="content content-scroll__inner">
          <view class="cover">
            <text class="cover-mark">01</text>
            <text class="cover-title">{{ $t('Little notes with a long life.') }}</text>
            <text class="cover-count">{{ $t(notes.length) }} {{ $t('NOTES') }}</text>
          </view>
          <text class="section-title">{{ $t('Saved notes') }}</text>
          <DiscoverDataLoading v-if="is_loading" />
          <view v-else>
            <view v-for="note in notes" :key="note.note_id" class="note-card">
              <text class="note-date">{{ $t(note.date) }}</text>
              <text class="note-title">{{ note.title }}</text>
              <text class="note-copy">{{ $t(note.copy) }}</text>
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
const notes = ref([])
const is_loading = ref(true)
onMounted(async () => {
  const result = await selectDynamicList({})
  if (result?.success) {
    const records = Array.isArray(result.data?.records) ? result.data.records : Array.isArray(result.data) ? result.data : []
    notes.value = records.slice(0, 20).map((item, index) => ({
      note_id: `${item.dynamicId || index}`,
      date: item.createDate || '',
      title: item.dynamicTitle || item.userName || 'Saved post',
      copy: item.dynamicContent || ''
    }))
  }
  is_loading.value = false
})
const theme_style = {
  '--page-background': theme.colors.page.background,
  '--title-color': theme.colors.text.title,
  '--secondary-color': theme.colors.text.secondary,
  '--accent-color': theme.colors.button.primary,
  '--accent-text': theme.colors.button.text,
  '--surface-color': theme.colors.surface.card_soft,
  '--route-transition-shadow': theme.colors.surface.shadow,
  background: theme.colors.page.background,
  color: theme.colors.text.title
}
</script>

<style scoped lang="scss">
.content {
  padding: 26rpx 40rpx 72rpx;
}

.cover {
  min-height: 298rpx;
  padding: 34rpx;
  border-radius: 36rpx;
  background: var(--accent-color);
  color: var(--accent-text);
}

.cover-mark {
  font-size: 26rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.cover-title {
  display: block;
  max-width: 430rpx;
  margin-top: 70rpx;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.16;
}

.cover-count {
  display: block;
  margin-top: 24rpx;
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.section-title {
  display: block;
  margin: 44rpx 0 20rpx;
  font-size: 33rpx;
  font-weight: 800;
}

.note-card {
  margin-top: 16rpx;
  padding: 28rpx;
  border-radius: 28rpx;
  background: var(--surface-color);
}

.note-date {
  color: var(--accent-color);
  font-size: 19rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.note-title {
  display: block;
  margin-top: 14rpx;
  font-size: 29rpx;
  font-weight: 800;
}

.note-copy {
  display: block;
  margin-top: 12rpx;
  color: var(--secondary-color);
  font-size: 24rpx;
  line-height: 1.45;
}
</style>
