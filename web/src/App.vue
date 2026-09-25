<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import { useWsStore } from './stores/ws';
import { usePetCatalogStore } from './stores/petCatalog';
import { clearPetAssetCache } from './lib/pet/asset';
import { WS_EVENTS } from './utils/events';
import ToastHost from './components/ToastHost.vue';

const ws = useWsStore();
const catalog = usePetCatalogStore();

// 家长端改了宠物物种（新建/改名/换图/删除）→ 服务端广播 species_changed，
// 所有在线端立即重拉目录并清掉立绘缓存，无需刷新页面、无需重启容器
function onSpeciesChanged() {
  catalog.load(true);
  clearPetAssetCache();
}

onMounted(() => {
  ws.connect();
  window.addEventListener(WS_EVENTS.speciesChanged, onSpeciesChanged);
});

onUnmounted(() => {
  ws.disconnect();
  window.removeEventListener(WS_EVENTS.speciesChanged, onSpeciesChanged);
});
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
