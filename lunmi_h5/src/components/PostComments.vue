<template>
  <view class="comments" :style="theme_style">
    <text class="comments__title">{{ $t('Replies') }}</text>
    <view v-if="!comments.length" class="comments__empty">{{ $t('No replies yet. Start the conversation.') }}</view>
    <view v-for="comment in comments" :key="comment.comment_id" class="comment">
      <UserAvatar class="comment__avatar" :source="comment.user_avatar_url" />
      <view class="comment__body">
        <text class="comment__name">{{ comment.user_name }}</text>
        <text class="comment__copy">{{ comment.content }}</text>
        <text class="comment__time">{{ $t(format_comment_time(comment.created_at)) }}</text>
      </view>
      <view
        class="comment__action"
        :class="{ 'comment__action--delete': is_current_user_comment(comment) }"
        role="button"
        :aria-label="$t(is_current_user_comment(comment) ? 'Delete reply' : 'Report reply')"
        :aria-disabled="Boolean(comment.is_temporary)"
        @click.stop="handle_comment_action(comment)"
      >
        <Delete v-if="is_current_user_comment(comment)" />
        <Warning v-else />
      </view>
    </view>
  </view>
</template>

<script setup>
import { Delete, Warning } from '@element-plus/icons-vue'
import theme from '@/config/theme.json'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  comments: { type: Array, default: () => [] },
  currentUserId: { type: String, default: '' }
})
const emit = defineEmits(['delete', 'report'])

const theme_style = {
  '--comment-title': theme.colors.text.title,
  '--comment-secondary': theme.colors.text.secondary,
  '--comment-surface': theme.colors.surface.card_soft,
  '--comment-report': theme.colors.icon.secondary,
  '--comment-delete': theme.colors.status.danger
}

const is_current_user_comment = (comment) => Boolean(
  props.currentUserId && comment?.user_id === props.currentUserId
)

const format_comment_time = (date) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
}).format(new Date(date))

const handle_comment_action = (comment) => {
  if (comment.is_temporary) return
  emit(is_current_user_comment(comment) ? 'delete' : 'report', comment)
}
</script>

<style scoped lang="scss">
.comments__title {
  display: block;
  margin: 36rpx 0 20rpx;
  color: var(--comment-title);
  font-size: 33rpx;
  font-weight: 800;
}

.comments__empty {
  padding: 32rpx;
  border-radius: 28rpx;
  background: var(--comment-surface);
  color: var(--comment-secondary);
  font-size: 23rpx;
  text-align: center;
}

.comment {
  display: flex;
  margin-top: 14rpx;
  align-items: flex-start;
  padding: 24rpx;
  border-radius: 28rpx;
  background: var(--comment-surface);
}

.comment__avatar {
  width: 58rpx;
  height: 58rpx;
  margin-right: 18rpx;
  border-radius: 20rpx;
}

.comment__body {
  min-width: 0;
  flex: 1;
}

.comment__name {
  display: block;
  color: var(--comment-title);
  font-size: 26rpx;
  font-weight: 800;
}

.comment__copy {
  display: block;
  margin-top: 10rpx;
  color: var(--comment-secondary);
  font-size: 24rpx;
  line-height: 1.4;
}

.comment__time {
  display: block;
  margin-top: 7rpx;
  color: var(--comment-secondary);
  font-size: 20rpx;
}

.comment__action {
  display: flex;
  width: 52rpx;
  height: 52rpx;
  align-items: center;
  justify-content: center;
  color: var(--comment-report);
  flex: none;
}

.comment__action--delete {
  color: var(--comment-delete);
}

.comment__action > * {
  width: 28rpx;
  height: 28rpx;
}
</style>
