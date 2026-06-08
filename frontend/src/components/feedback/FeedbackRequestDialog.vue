<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card class="feedback-dialog-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">기능 개선 요청</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-form @submit.prevent="submit">
        <q-card-section class="q-gutter-md">
          <q-input
            v-model="form.title"
            label="제목"
            outlined
            dense
            :rules="[val => !!val || '제목을 입력해주세요']"
          />
          <q-input
            v-model="form.content"
            label="내용"
            type="textarea"
            outlined
            autogrow
            :rules="[val => (val && val.length >= 10) || '내용을 10자 이상 입력해주세요']"
          />
          <q-file
            v-model="form.file"
            label="첨부 파일 (선택)"
            outlined
            dense
            clearable
            accept="image/*,.pdf,.zip"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
          <q-input v-model="form.pageUrl" label="요청 페이지" outlined dense readonly />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            label="등록"
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
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { useFeedback } from '@/composables/useFeedback'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'submitted'])

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
    $q.notify({ type: 'positive', message: '기능 개선 요청이 등록되었습니다. 감사합니다!' })
    emit('submitted')
    resetForm()
    isOpen.value = false
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e?.message ?? '등록에 실패했습니다. 잠시 후 다시 시도해주세요.' })
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
