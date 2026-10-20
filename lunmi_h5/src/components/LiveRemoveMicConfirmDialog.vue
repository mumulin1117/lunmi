<template>
  <LiveRoomConfirmDialog
    :visible="visible"
    :title="$t(`Move ${targetName || 'this user'} off the mic?`)"
    :copy="$t('They will leave the seat. You can invite them again later.')"
    :confirm-label="$t('Move off')"
    :cancel-label="$t('Cancel')"
    confirm-kind="danger"
    @cancel="emit('cancel')"
    @confirm="emit('confirm')"
  />
</template>

<script setup>
import LiveRoomConfirmDialog from '@/components/LiveRoomConfirmDialog.vue'

defineProps({
  visible: { type: Boolean, default: false },
  targetName: { type: String, default: '' }
})
const emit = defineEmits(['cancel', 'confirm'])
</script>
