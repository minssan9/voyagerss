<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-grey-9 text-white">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          🛠️ KOSPI FG Admin
        </q-toolbar-title>

        <div class="q-gutter-sm row items-center no-wrap">
          <!-- User Info -->
          <q-btn
            flat
            round
            dense
            icon="account_circle"
          >
            <q-menu>
              <q-list style="min-width: 200px">
                <q-item-label header>관리자</q-item-label>
                <q-item clickable v-close-popup>
                  <q-item-section avatar>
                    <q-icon name="settings" />
                  </q-item-section>
                  <q-item-section>설정</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="logout">
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>로그아웃</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <!-- Main Site Link -->
          <q-btn
            flat
            icon="home"
            label="메인 사이트"
            to="/"
            class="q-ml-sm"
          />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-grey-1"
      :width="280"
    >
      <q-scroll-area class="fit">
        <q-list>
          <q-item-label header class="text-grey-8">
            관리자 메뉴
          </q-item-label>

          <q-item
            clickable
            v-ripple
            :to="{ name: 'admin-dashboard' }"
            exact-active-class="bg-blue-1 text-blue-10"
          >
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>
              <q-item-label>대시보드</q-item-label>
              <q-item-label caption>시스템 현황</q-item-label>
            </q-item-section>
          </q-item>


          <q-item
            clickable
            v-ripple
            :to="{ name: 'admin-dart' }"
            exact-active-class="bg-blue-1 text-blue-10"
          >
            <q-item-section avatar>
              <q-icon name="business" />
            </q-item-section>
            <q-item-section>
              <q-item-label>DART 관리</q-item-label>
              <q-item-label caption>공시 데이터 수집 관리</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            :to="{ name: 'admin-fear-greed' }"
            exact-active-class="bg-blue-1 text-blue-10"
          >
            <q-item-section avatar>
              <q-icon name="trending_up" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Fear & Greed 관리</q-item-label>
              <q-item-label caption>지수 계산 및 관리</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-md" />

          <q-item-label header class="text-grey-8">
            시스템
          </q-item-label>

          <q-item
            clickable
            v-ripple
            @click="showSystemInfo"
          >
            <q-item-section avatar>
              <q-icon name="info" />
            </q-item-section>
            <q-item-section>
              <q-item-label>시스템 정보</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            @click="showLogs"
          >
            <q-item-section avatar>
              <q-icon name="description" />
            </q-item-section>
            <q-item-section>
              <q-item-label>로그 보기</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Footer -->
    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar class="justify-center">
        <q-toolbar-title class="text-center text-caption">
          investand Admin Panel | 
          Last Update: {{ lastUpdateTime }}
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'

const router = useRouter()
const $q = useQuasar()

const leftDrawerOpen = ref(false)
const currentTime = ref(new Date())
let timeInterval: NodeJS.Timeout

const lastUpdateTime = computed(() => {
  return format(currentTime.value, 'yyyy-MM-dd HH:mm:ss')
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function logout() {
  $q.dialog({
    title: '로그아웃',
    message: '정말 로그아웃하시겠습니까?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    // TODO: 실제 로그아웃 로직 구현
    localStorage.removeItem('admin_token')
    router.push('/')
    $q.notify({
      type: 'positive',
      message: '로그아웃되었습니다.',
      position: 'top'
    })
  })
}

function showSystemInfo() {
  $q.dialog({
    title: '시스템 정보',
    message: `
      Frontend Version: 1.0.0
      Build: Production
      Environment: development
      API Endpoint: /api
    `,
    html: true
  })
}

function showLogs() {
  $q.notify({
    type: 'info',
    message: '로그 기능은 개발 중입니다.',
    position: 'top'
  })
}

onMounted(() => {
  // 시간 업데이트 인터벌
  timeInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style lang="scss" scoped>
.q-layout {
  .q-header {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .q-drawer {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }
  
  .q-footer {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }
}

.q-item {
  border-radius: 8px;
  margin: 4px 8px;
  
  &.q-router-link--exact-active {
    font-weight: 600;
  }
}

.q-toolbar-title {
  font-weight: 600;
  font-size: 1.1rem;
}
</style>