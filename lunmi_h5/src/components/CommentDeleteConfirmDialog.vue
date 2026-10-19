<template>
  <DeleteConfirmDialog
    :visible="visible"
    :title="$t(DELETE_COPY.comment.title)"
    :copy="$t(DELETE_COPY.comment.copy)"
    :error="error"
    :pending="pending"
    @cancel="emit('cancel')"
    @confirm="emit('confirm')"
  />
</template>

<script setup>
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import { DELETE_COPY } from '@/utils/deleteConfirmPresentation'

defineProps({
  visible: { type: Boolean, default: false },
  error: { type: String, default: '' },
  pending: { type: Boolean, default: false }
})
const emit = defineEmits(['cancel', 'confirm'])
</script>
