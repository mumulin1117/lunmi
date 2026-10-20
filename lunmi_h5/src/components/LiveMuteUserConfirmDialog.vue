<template>
  <LiveRoomConfirmDialog
    :visible="visible"
    :title="$t(`Mute ${targetName || 'this user'}?`)"
    :copy="$t('They will not be able to speak in this room until you unmute them.')"
    :confirm-label="$t('Mute')"
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
