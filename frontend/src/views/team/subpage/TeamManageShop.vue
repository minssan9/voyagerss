<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <h5 class="q-mt-none q-mb-none">{{ t('team.shop.title', 'Shop Management') }}</h5>
      <div class="row q-gutter-sm">
        <q-btn 
          :label="t('team.shop.addShop', 'Add Shop')" 
          color="primary" 
          outline
          size="sm"
          @click="openAddShopDialog" 
          icon="add_business"
        />
        <q-btn 
          :label="t('team.shop.refresh', 'Refresh')" 
          color="secondary" 
          outline
          size="sm"
          @click="fetchShops" 
          icon="refresh"
        />
      </div>
    </div>
    
    <div class="q-mt-md shop-grid">
      <q-card flat bordered>
        <q-card-section class="q-pa-none">
          <GridDefault
            :rowData="shops"
            :columnDefs="columnDefs"
            :gridOptions="gridOptions"
            class="ag-theme-alpine"
            domLayout="autoHeight"
          />
        </q-card-section>
      </q-card>
    </div>
    
    <!-- Empty state when no shops -->
    <div v-if="shops.length === 0" class="text-center q-pa-lg text-grey-7">
      <q-icon name="shop" size="48px" />
      <div class="text-h6 q-mt-sm">{{ t('team.shop.noShops', 'No shops found') }}</div>
      <div class="q-mt-sm">{{ t('team.shop.clickAddShop', 'Click "Add Shop" to add a new shop') }}</div>
    </div>
    
    <!-- Shop Dialog (used for both add and edit) -->
    <q-dialog v-model="showShopDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{ dialogMode === 'add' ? t('team.shop.addShop', 'Add Shop') : t('team.shop.editShop', 'Edit Shop') }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="handleSubmit" class="row q-col-gutter-md">
            <div class="col-12">
              <q-input v-model="shopForm.name" :label="t('team.shop.shopName', 'Shop Name')" filled dense required />
            </div>
            <div class="col-12">
              <q-input v-model="shopForm.address" :label="t('team.shop.address', 'Address')" filled dense />
            </div>
            <div class="col-12">
              <q-input v-model="shopForm.region" :label="t('team.shop.region', 'Region')" filled dense />
            </div>
            <div class="col-12 text-subtitle2">{{ t('team.shop.operatingHours', 'Operating Hours') }}</div>
            <div v-for="day in daysOfWeek" :key="day.value" class="col-12">
              <div class="row q-col-gutter-sm items-center">
                <div class="col-4">
                  <q-checkbox v-model="shopForm.operatingHours[day.value].isOpen" :label="day.label" />
                </div>
                <div class="col-4">
                  <q-time v-model="shopForm.operatingHours[day.value].startTime" format24h :label="t('team.shop.startTime', 'Start Time')" filled dense :disable="!shopForm.operatingHours[day.value].isOpen" />
                </div>
                <div class="col-4">
                  <q-time v-model="shopForm.operatingHours[day.value].endTime" format24h :label="t('team.shop.endTime', 'End Time')" filled dense :disable="!shopForm.operatingHours[day.value].isOpen" />
                </div>
              </div>
            </div>
          </q-form>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="dialogMode === 'add'" :label="t('common.cancel', 'Cancel')" color="secondary" flat v-close-popup />
          <q-btn v-if="dialogMode === 'edit'" :label="t('common.cancel', 'Cancel')" color="secondary" flat v-close-popup />
          <q-btn v-if="dialogMode === 'add'" :label="t('common.submit', 'Submit')" color="primary" @click="handleSubmit" :loading="isSubmitting" />
          <q-btn v-if="dialogMode === 'edit'" :label="t('common.save', 'Save')" color="primary" @click="handleSubmit" :loading="isSubmitting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    
    <!-- Shop Details Dialog -->
    <q-dialog v-model="showShopDetails">
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ t('team.shop.shopDetails', 'Shop Details') }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedShop">
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <div class="detail-item">
                <div class="detail-label">{{ t('team.shop.shopName', 'Shop Name') }}</div>
                <div class="detail-value">{{ selectedShop.name }}</div>
              </div>
            </div>
            <div class="col-12">
              <div class="detail-item">
                <div class="detail-label">{{ t('team.shop.region', 'Region') }}</div>
                <div class="detail-value">{{ selectedShop.region || 'N/A' }}</div>
              </div>
            </div>
            <div class="col-12">
              <div class="detail-item">
                <div class="detail-label">{{ t('team.shop.address', 'Address') }}</div>
                <div class="detail-value">{{ selectedShop.address || 'N/A' }}</div>
              </div>
            </div>
            
            <div class="col-12" v-if="selectedShopWithHours.operatingHours[day.value]?.isOpen">
              <div class="detail-item">
                <div class="detail-label">{{ t('team.shop.operatingHours', 'Operating Hours') }}</div>
                <div class="q-mt-sm">
                  <div v-for="day in daysOfWeek" :key="day.value" class="row q-mb-xs">
                    <div class="col-4 text-weight-medium">{{ day.label }}</div>
                    <div class="col-8">
                      <template v-if="selectedShopWithHours.operatingHours[day.value]?.isOpen">
                        {{ selectedShopWithHours.operatingHours[day.value].startTime }} - {{ selectedShopWithHours.operatingHours[day.value].endTime }}
                      </template>
                      <template v-else>
                        {{ t('team.shop.closed', 'Closed') }}
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn 
            :label="t('team.shop.edit', 'Edit')" 
            color="primary" 
            @click="editShop" 
            v-close-popup
          />
          <q-btn 
            :label="t('team.shop.delete', 'Delete')" 
            color="negative" 
            @click="confirmDelete" 
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineProps, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import GridDefault from '@/components/grid/GridDefault.vue'
import apiTeamShop, { Shop as ApiShop } from '@/api/modules/api-team-shop'
import { daysOfWeek } from '@/api/modules/api-account-schedule'

type ShopForm = ApiShop & {
  operatingHours: Record<string, { isOpen: boolean; startTime: string; endTime: string }>
}

function getDefaultOperatingHours() {
  const result: Record<string, { isOpen: boolean; startTime: string; endTime: string }> = {}
  daysOfWeek.forEach(day => {
    result[day.value] = { isOpen: false, startTime: '09:00', endTime: '17:00' }
  })
  return result
}

const props = defineProps({
  teamId: {
    type: Number,
    required: true
  }
})

const { t } = useI18n()
const $q = useQuasar()

const shops = ref<ApiShop[]>([])
const isLoading = ref(false)
const showShopDialog = ref(false)
const showShopDetails = ref(false)
const selectedShop = ref<ApiShop | null>(null)
const isSubmitting = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingShopId = ref<number | null>(null)

const shopForm = ref<ShopForm>({
  name: '',
  address: '',
  region: '',
  teamId: props.teamId,
  operatingHours: getDefaultOperatingHours()
})

// Grid options with row click handler
const gridOptions = ref({
  onRowClicked: (params) => {
    // Only handle row clicks if the click wasn't on the delete button
    if (!params.event.defaultPrevented) {
      console.log('Row clicked:', params);
      selectedShop.value = params.data;
      showShopDetails.value = true;
    }
  },
  // Make rows look clickable
  rowStyle: { cursor: 'pointer' }
})

const columnDefs = ref([
  { 
    field: 'name', 
    headerName: t('team.shop.grid.name', 'Shop Name'),
    cellRenderer: (params) => {
      return `<div class="clickable-cell">${params.value}</div>`;
    }
  },
  { field: 'phone', headerName: t('team.shop.grid.phone', 'Phone') },
  { field: 'address', headerName: t('team.shop.grid.address', 'Address') },
  { field: 'district', headerName: t('team.shop.grid.district', 'District') },
  { field: 'actions',
    headerName: t('team.shop.grid.actions', 'Actions'),
    cellRenderer: () => {
      return `<button class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--round q-btn--actionable q-focusable q-hoverable q-btn--dense text-negative">
        <span class="q-focus-helper"></span>
        <span class="q-btn__content text-center">
          <i aria-hidden="true" role="presentation" class="material-icons q-icon">delete</i>
        </span>
      </button>`;
    },
    onCellClicked: (params) => {
      // Prevent the row click event
      params.event.preventDefault();
      handleDelete(params.data.id);
    }
  }
])
 
// Fetch shops from API
const fetchShops = async () => {
  try {
    isLoading.value = true;
    const response = await apiTeamShop.getShopsByTeamId(props.teamId);
    shops.value = response.data;
  } catch (error) {
    console.error('Failed to fetch shops', error)
    $q.notify({ type: 'negative', message: t('team.shop.fetchError', 'Failed to load shops') });
  } finally {
    isLoading.value = false;
  }
}

const openAddShopDialog = () => {
  dialogMode.value = 'add';
  editingShopId.value = null;
  handleReset();
  showShopDialog.value = true;
}

const handleSubmit = async () => {
  try {
    isSubmitting.value = true;
    
    if (dialogMode.value === 'add') {
      const response = await apiTeamShop.createShop(props.teamId, shopForm.value as ApiShop);
      shops.value.push(response.data);
      $q.notify({ type: 'positive', message: t('team.shop.shopAdded', 'Shop added successfully') });
    } else {      
      if (editingShopId.value !== null) {
        const response = await apiTeamShop.updateShop(props.teamId, editingShopId.value, shopForm.value as ApiShop);
        const index = shops.value.findIndex(s => s.id === editingShopId.value);
        if (index !== -1) {
          shops.value[index] = response.data;
        }
        $q.notify({ type: 'positive', message: t('team.shop.shopUpdated', 'Shop updated successfully') });
      }
    }
    
    showShopDialog.value = false;
  } catch (error) {
    $q.notify({ type: 'negative', message: dialogMode.value === 'add' ? t('team.shop.addError', 'Failed to add shop') : t('team.shop.updateError', 'Failed to update shop') });
  } finally {
    isSubmitting.value = false;
  }
}

const handleDelete = async (id) => {
  try {
    $q.dialog({
      title: t('team.shop.confirmDelete', 'Confirm Deletion'),
      message: t('team.shop.deleteMessage', 'Are you sure you want to delete this shop?'),
      cancel: true,
      persistent: true
    }).onOk(async () => {
      await apiTeamShop.deleteShop(props.teamId, id);
      shops.value = shops.value.filter(shop => shop.id !== id);
      $q.notify({ type: 'positive', message: t('team.shop.shopDeleted', 'Shop deleted successfully') });
    })
  } catch (error) {
    $q.notify({ type: 'negative', message: t('team.shop.deleteError', 'Failed to delete shop') });
  }
}

const editShop = () => {
  if (!selectedShop.value) return;
  
  dialogMode.value = 'edit';
  editingShopId.value = selectedShop.value.id || null;
  
  // Populate the form with selected shop data
  shopForm.value = {
    name: selectedShop.value.name,
    address: selectedShop.value.address || '',
    region: selectedShop.value.region || '',
    teamId: props.teamId,
    operatingHours: getDefaultOperatingHours()
  }
  
  // Show the dialog
  showShopDialog.value = true;
}

const confirmDelete = () => {
  if (selectedShop.value && selectedShop.value.id) {
    handleDelete(selectedShop.value.id);
  }
}

const handleReset = () => {
  shopForm.value = {
    name: '',
    address: '',
    region: '',
    teamId: props.teamId,
    operatingHours: getDefaultOperatingHours()
  }
}

// Watch for changes in teamId
watch(() => props.teamId, (newVal) => {
  shopForm.value.teamId = newVal
  fetchShops()
})

const selectedShopWithHours = computed<ShopForm>(() => {
  if (selectedShop.value && (selectedShop.value as any).operatingHours) {
    return selectedShop.value as ShopForm
  }
  return {
    ...selectedShop.value,
    operatingHours: getDefaultOperatingHours()
  } as ShopForm
})

onMounted(() => { 
  fetchShops()
})
</script>

<style scoped>
.shop-grid {
  margin-bottom: 16px;
}

.ag-theme-alpine {
  --ag-header-height: 36px;
  --ag-row-height: 36px;
  --ag-font-size: 13px;
  --ag-header-foreground-color: #5c5c5c;
  --ag-header-background-color: #f5f5f5;
  --ag-odd-row-background-color: #fcfcfc;
}

.q-card {
  box-shadow: none;
  border-radius: 8px;
}

.clickable-cell {
  cursor: pointer;
  color: var(--q-primary);
  text-decoration: underline;
}

.detail-item {
  margin-bottom: 12px;
}

.detail-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 1rem;
  font-weight: 500;
}
</style>