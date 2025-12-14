<template>
  <q-dialog v-model="isOpen" @hide="resetForm">
    <q-card class="dialog-card large">
      <q-card-section class="dialog-title">
        <div class="text-h6">Team Registration</div>
      </q-card-section>

      <q-card-section class="dialog-content">
        <q-form @submit="onSubmit" class="dialog-form q-gutter-md"> 
          
          <!-- Team Information -->
          <div class="row">
            <div class="col-12 col-md-6">
              <q-input
                v-model="teamForm.name"
                label="Team Name"
                required
                filled
                :rules="[val => !!val || 'Team name is required']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="teamForm.region"
                label="Region"
                required
                filled
                :rules="[val => !!val || 'Region is required']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-select
                v-model="teamForm.scheduleType"
                :options="scheduleTypes"
                label="Schedule Type"
                required
                filled
                :rules="[val => !!val || 'Schedule type is required']"
              />
            </div>
          </div>
          
          <div class="row justify-end q-mt-md">
            <q-btn
              type="submit"
              label="Register Team"
              color="primary"
              unelevated
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import {defineEmits, defineModel, defineProps, ref} from 'vue'
import {useQuasar} from 'quasar'
import {TeamDTO} from '@/api/modules/api-team'
import apiTeam from '@/api/modules/api-team'

// Props and emits
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'team-registered'])
const isOpen = defineModel('modelValue')

// Setup
const $q = useQuasar()
 

// Schedule types
const scheduleTypes = [
  'Weekly',
  'Bi-weekly',
  'Monthly',
  'Custom'
]

// Form data
const teamForm = ref<Partial<TeamDTO>>({
  name: '',
  region: '',
  scheduleType: 'Weekly',
  preferredPlaces: []
})

// Reset form function
const resetForm = () => {
  teamForm.value = {
    name: '',
    region: '',
    scheduleType: 'Weekly',
    preferredPlaces: []
  }  
}


const onSubmit = async () => {
  try {
    const response = await apiTeam.registerTeam(teamForm.value as TeamDTO)

    // Check response status
    if (response.status >= 200 && response.status < 300) {
      const newTeam = response.data
      emit('team-registered', newTeam)
      
      // Show success notification
      $q.notify({ type: 'positive', message: 'Team registered successfully' })
      
      // Close the dialog - this will trigger resetForm via @hide
      isOpen.value = false
    } else {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (error) {
    console.error('Failed to register team:', error)
    $q.notify({ type: 'negative', message: 'Failed to register team' })
  }
}
</script> 