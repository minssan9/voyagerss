<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
const router = useRouter();
onMounted(() => router.replace('/issues'));
</script>
<template><div /></template>
