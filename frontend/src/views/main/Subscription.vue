<template>
  <q-page class="page-container">
    <div class="content-section q-pa-md">
      <div class="q-px-lg">
        <!-- Header -->
        <div class="text-h5 q-mb-lg">Subscription</div>

        <!-- Pricing Cards -->
        <div class="row q-col-gutter-md">
          <div 
            v-for="plan in plans" 
            :key="plan.type"
            class="col-3 col-xs-12"
          >
            <q-card 
              flat 
              bordered 
              class="subscription-card"
              :class="{ 'selected-plan': planType === plan.type }"
            >
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="col-auto">
                    <div class="text-grey">{{ plan.name }}</div>
                    <div class="text-h4 q-mt-sm">
                      <span class="text-primary">${{ plan.price }}</span>
                    </div>
                  </div>
                  <div class="col-auto">
                    <q-btn 
                      :color="planType === plan.type ? 'grey' : plan.buttonColor"
                      :class="[
                        'subscription-btn',
                        planType === plan.type ? 'current-plan' : ''
                      ]"
                      :label="planType === plan.type ? 'Current Plan' : 'Choose'" 
                      @click="subscribe(plan.type)"
                      :disable="planType === plan.type"
                      rounded
                      unelevated
                    />
                  </div>
                </div>
                <div class="text-grey-7 q-mt-md">
                  {{ plan.description }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Features Section -->
        <div class="q-mt-xl">
          <div class="text-subtitle1 q-mb-md">All accounts included:</div>
          <div class="row q-col-gutter-md">
            <div class="col-3" v-for="(feature, index) in features" :key="index">
              <div class="flex items-center q-mb-sm">
                <q-icon name="check" color="green" size="xs" class="q-mr-sm" />
                <span class="text-grey-7">{{ feature }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import apiSubscription from '@/api/modules/api-subscription'

const $q = useQuasar()
const planType = ref(null)

const plans = [
  {
    type: 'premium',
    name: 'PREMIUM',
    price: 150,
    buttonColor: 'deep-purple',
    description: 'Premium features and support for advanced users'
  },
  {
    type: 'basic',
    name: 'BASIC',
    price: 100,
    buttonColor: 'blue-7',
    description: 'Standard features for regular users'
  },
  {
    type: 'starter',
    name: 'STARTER',
    price: 50,
    buttonColor: 'teal',
    description: 'Essential features for beginners'
  },
  {
    type: 'small',
    name: 'SMALL',
    price: 10,
    buttonColor: 'cyan-7',
    description: 'Basic features for small needs'
  }
]

const features = [
  'One user included',
  'Basic support',
  'Access to main features',
  'Regular updates',
  'Community access',
  'Email support',
  'API access',
  'Developer tools'
]

onMounted(async () => {
  try {
    const response = await apiSubscription.getCurrentPlan()
    planType.value = response.data.planType
  } catch (error) {
    console.error('Error fetching current plan:', error)
  }
})

async function subscribe(plan) {
  try {
    await apiSubscription.subscribe(plan)
    planType.value = plan
    $q.notify({
      type: 'positive',
      message: 'Successfully subscribed to ' + plan + ' plan',
      position: 'bottom'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error during subscription process. Please try again.',
      position: 'bottom'
    })
  }
}
</script>

<style scoped>
.subscription-card {
  height: 100%;
  transition: all 0.3s ease;
}

.subscription-card:hover {
  border-color: var(--q-primary);
}

.selected-plan {
  border: 2px solid var(--q-primary);
  background-color: rgba(var(--q-primary), 0.05);
}

.subscription-card .q-card__section {
  padding: 24px;
}

.subscription-btn {
  min-width: 120px;
  font-weight: 500;
}

.subscription-btn.current-plan {
  background-color: #e0e0e0 !important;
  color: #666 !important;
}
</style>