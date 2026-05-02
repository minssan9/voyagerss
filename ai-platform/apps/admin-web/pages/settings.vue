<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const api   = useApi();
const toast = useToast();

const form = reactive({ repoFullName: '', baseBranch: 'main', origin: '' });
const saving = ref(false);

interface Origin { id: string; origin: string; }
const origins = ref<Origin[]>([]);

onMounted(async () => {
  try {
    origins.value = await api.get<Origin[]>('/api/admin/origins');
  } catch { /* ignore */ }
});

async function saveRepo() {
  if (!form.repoFullName) return;
  saving.value = true;
  try {
    // Saved in issues per-issue; global default stored locally for convenience
    localStorage.setItem('default_repo', JSON.stringify({ repoFullName: form.repoFullName, baseBranch: form.baseBranch }));
    toast.success(`저장소 ${form.repoFullName} 가 기본값으로 설정되었습니다.`);
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    saving.value = false;
  }
}

async function addOrigin() {
  if (!form.origin) return;
  try {
    const added = await api.post<Origin>('/api/admin/origins', { origin: form.origin });
    origins.value.push(added);
    toast.success('Origin이 추가되었습니다.');
    form.origin = '';
  } catch (e: any) {
    toast.error(e.message ?? '오류가 발생했습니다.');
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-xl font-700 tracking-tight mb-6">Settings</h1>

    <!-- Repository connection -->
    <div class="card p-6 mb-6">
      <h2 class="text-sm font-600 mb-1">GitHub Repository</h2>
      <p class="text-xs text-muted mb-5">
        이슈에서 Approve 시 자동으로 사용할 기본 저장소를 연결합니다.
      </p>
      <form class="flex flex-col gap-4" @submit.prevent="saveRepo">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-500">Repository (owner/repo)</label>
          <input
            v-model="form.repoFullName"
            class="input"
            placeholder="myorg/my-repo"
            pattern="[\w.-]+/[\w.-]+"
            required
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-500">Base branch</label>
          <input v-model="form.baseBranch" class="input" placeholder="main" />
        </div>
        <div>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Widget Origin allowlist -->
    <div class="card p-6">
      <h2 class="text-sm font-600 mb-1">Widget Origin 허용 목록</h2>
      <p class="text-xs text-muted mb-5">
        피드백 위젯을 삽입할 수 있는 도메인을 허용 목록에 추가합니다.
      </p>
      <form class="flex gap-3 mb-4" @submit.prevent="addOrigin">
        <input
          v-model="form.origin"
          class="input flex-1"
          placeholder="https://your-site.com"
          type="url"
        />
        <button type="submit" class="btn btn-primary flex-shrink-0">추가</button>
      </form>
      <ul v-if="origins.length" class="flex flex-col gap-2">
        <li
          v-for="o in origins"
          :key="o.id"
          class="flex items-center gap-2 text-sm px-3 py-2 bg-surface rounded-xl border border-border"
        >
          <span class="text-green-500 text-xs">●</span>
          <span class="font-mono text-xs flex-1">{{ o.origin }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
