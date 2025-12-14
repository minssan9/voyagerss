<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6">백업 관리</div>
          <div>
            <q-btn
              color="primary"
              icon="backup"
              label="백업 생성"
              @click="createBackup"
              :loading="creating"
              class="q-mr-md"
            />
            <q-btn
              color="warning"
              icon="restore"
              label="백업 복원"
              @click="showRestoreDialog = true"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">데이터 검증</div>
            <div class="q-mt-md">
              <q-btn
                color="info"
                icon="check_circle"
                label="데이터 검증 실행"
                @click="validateData"
                :loading="validating"
              />
            </div>
            <div v-if="validationResult" class="q-mt-md">
              <q-banner
                :class="validationResult.valid ? 'bg-positive' : 'bg-negative'"
                class="text-white"
              >
                <template v-slot:avatar>
                  <q-icon
                    :name="validationResult.valid ? 'check_circle' : 'error'"
                    size="md"
                  />
                </template>
                <div v-if="validationResult.valid">
                  데이터가 유효합니다
                </div>
                <div v-else>
                  데이터에 오류가 있습니다:
                  <ul>
                    <li v-for="error in validationResult.errors" :key="error">
                      {{ error }}
                    </li>
                  </ul>
                </div>
              </q-banner>
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>
    </q-card>

    <!-- Restore Dialog -->
    <q-dialog v-model="showRestoreDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">백업 복원</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-file
            v-model="backupFile"
            label="백업 파일 선택"
            accept=".json"
            outlined
            :rules="[val => !!val || '파일을 선택하세요']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="취소" color="primary" v-close-popup />
          <q-btn
            flat
            label="복원"
            color="warning"
            @click="restoreBackup"
            :loading="restoring"
            :disable="!backupFile"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { backupsApi, knowledgeApi } from '../api/client';
import { useQuasar } from 'quasar';
import type { ValidationResult } from '../types/api';

const $q = useQuasar();
const creating = ref(false);
const restoring = ref(false);
const validating = ref(false);
const showRestoreDialog = ref(false);
const backupFile = ref<File | null>(null);
const validationResult = ref<ValidationResult | null>(null);

async function createBackup() {
  creating.value = true;
  try {
    const result = await backupsApi.create();
    $q.notify({
      type: 'positive',
      message: `백업이 생성되었습니다: ${result.filename}`
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '백업 생성 실패: ' + error.message
    });
  } finally {
    creating.value = false;
  }
}

async function restoreBackup() {
  if (!backupFile.value) {
    $q.notify({
      type: 'negative',
      message: '파일을 선택하세요'
    });
    return;
  }

  restoring.value = true;
  try {
    await backupsApi.restore(backupFile.value);
    $q.notify({
      type: 'positive',
      message: '백업이 복원되었습니다'
    });
    showRestoreDialog.value = false;
    backupFile.value = null;
    validationResult.value = null;
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '백업 복원 실패: ' + error.message
    });
  } finally {
    restoring.value = false;
  }
}

async function validateData() {
  validating.value = true;
  try {
    validationResult.value = await knowledgeApi.validate();
    if (validationResult.value.valid) {
      $q.notify({
        type: 'positive',
        message: '데이터가 유효합니다'
      });
    } else {
      $q.notify({
        type: 'negative',
        message: '데이터 검증 실패'
      });
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: '검증 실패: ' + error.message
    });
  } finally {
    validating.value = false;
  }
}
</script>

<style scoped lang="sass">
</style>




