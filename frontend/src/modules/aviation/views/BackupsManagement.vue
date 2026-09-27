<template>
  <q-page padding>
    <q-card>
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6">{{ t('aviation.backups.title') }}</div>
          <div>
            <q-btn
              color="primary"
              icon="backup"
              :label="t('aviation.backups.createBackup')"
              @click="createBackup"
              :loading="creating"
              class="q-mr-md"
            />
            <q-btn
              color="warning"
              icon="restore"
              :label="t('aviation.backups.restoreBackup')"
              @click="showRestoreDialog = true"
            />
          </div>
        </div>
      </q-card-section>

      <q-card-section>
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">{{ t('aviation.backups.dataValidation') }}</div>
            <div class="q-mt-md">
              <q-btn
                color="info"
                icon="check_circle"
                :label="t('aviation.backups.runValidation')"
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
                  {{ t('aviation.backups.dataValid') }}
                </div>
                <div v-else>
                  {{ t('aviation.backups.dataInvalid') }}
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
          <div class="text-h6">{{ t('aviation.backups.restoreTitle') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-file
            v-model="backupFile"
            :label="t('aviation.backups.selectFile')"
            accept=".json"
            outlined
            :rules="[val => !!val || t('aviation.backups.fileRequired')]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="t('aviation.common.cancel')" color="primary" v-close-popup />
          <q-btn
            flat
            :label="t('aviation.backups.restore')"
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
import { backupsApi, knowledgeApi } from '@/modules/aviation/api/client';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { ValidationResult } from '@/types/aviation/api';

const $q = useQuasar();
const { t } = useI18n();
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
      message: t('aviation.backups.notify.createSuccess', { filename: result.filename })
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: t('aviation.backups.notify.createFailed', { message: error.message })
    });
  } finally {
    creating.value = false;
  }
}

async function restoreBackup() {
  if (!backupFile.value) {
    $q.notify({
      type: 'negative',
      message: t('aviation.backups.notify.selectFile')
    });
    return;
  }

  restoring.value = true;
  try {
    await backupsApi.restore(backupFile.value);
    $q.notify({
      type: 'positive',
      message: t('aviation.backups.notify.restoreSuccess')
    });
    showRestoreDialog.value = false;
    backupFile.value = null;
    validationResult.value = null;
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: t('aviation.backups.notify.restoreFailed', { message: error.message })
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
        message: t('aviation.backups.notify.validationSuccess')
      });
    } else {
      $q.notify({
        type: 'negative',
        message: t('aviation.backups.notify.validationFailed')
      });
    }
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: t('aviation.backups.notify.validateFailed', { message: error.message })
    });
  } finally {
    validating.value = false;
  }
}
</script>

<style scoped lang="sass">
</style>
