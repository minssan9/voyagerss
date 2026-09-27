<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="feedback-dialog-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ t('feedback.title') }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-form @submit.prevent="submit">
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="form.title"
            :label="t('feedback.columns.title')"
            outlined
            dense
            :rules="[val => !!val || t('feedback.form.titleRequired')]"
          />
          <q-input
            v-model="form.content"
            :label="t('feedback.columns.content')"
            type="textarea"
            outlined
            autogrow
            :rules="[val => (val && val.length >= 10) || t('feedback.form.contentMinLength')]"
          />
          <q-file
            v-model="form.file"
            :label="t('feedback.form.attachmentOptional')"
            outlined
            dense
            clearable
            accept="image/*,.pdf,.zip"
            :rules="[val => !val || val.size <= 5242880 || t('feedback.form.fileSizeLimit')]"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
          <q-input v-model="form.pageUrl" :label="t('feedback.columns.pageUrl')" outlined dense readonly />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            :label="t('common.submit')"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { useFeedback } from '@/composables/useFeedback'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'submitted'])

const { t } = useI18n()
const $q = useQuasar()
const route = useRoute()
const { loading, createFeedback } = useFeedback()

const isOpen = ref(props.modelValue)
watch(() => props.modelValue, v => (isOpen.value = v))
watch(isOpen, v => {
  emit('update:modelValue', v)
  if (v) fillFromCurrentPage()
})

const form = reactive<{ title: string; content: string; file: File | null; pageUrl: string }>({
  title: '',
  content: '',
  file: null,
  pageUrl: '',
})

function fillFromCurrentPage() {
  form.pageUrl = window.location.href
}

function resetForm() {
  form.title = ''
  form.content = ''
  form.file = null
  fillFromCurrentPage()
}

async function submit() {
  try {
    await createFeedback({
      title: form.title,
      content: form.content,
      pageUrl: form.pageUrl,
      file: form.file,
    })
    $q.notify({ type: 'positive', message: t('feedback.submitSuccess') })
    emit('submitted')
    resetForm()
    isOpen.value = false
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e?.message ?? t('feedback.submitFailed') })
  }
}

watch(() => route.fullPath, () => {
  if (isOpen.value) fillFromCurrentPage()
})
</script>

<style scoped>
.feedback-dialog-card {
  width: 480px;
  max-width: 92vw;
}
</style>
