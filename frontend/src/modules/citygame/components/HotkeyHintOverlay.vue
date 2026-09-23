<script setup lang="ts">
import { HOTKEY_HINTS } from '../config/hotkeys'
import { useCityGameStore } from '../store/store_citygame'

const store = useCityGameStore()
</script>

<template>
    <transition name="fade">
        <div v-if="store.showHotkeyHints" class="hint-overlay">
            <div class="hint-header">
                <span>단축키</span>
                <button class="close-btn" @click="store.toggleHotkeyHints()">H</button>
            </div>
            <ul class="hint-list">
                <li v-for="hint in HOTKEY_HINTS" :key="hint.keys">
                    <span class="hint-keys">{{ hint.keys }}</span>
                    <span class="hint-desc">{{ hint.description }}</span>
                </li>
            </ul>
        </div>
    </transition>
</template>

<style scoped>
.hint-overlay {
    position: absolute;
    right: 20px;
    bottom: 100px;
    pointer-events: auto;
    background: rgba(30, 30, 32, 0.6);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 16px;
    padding: 14px 16px;
    color: #f5f5f7;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    width: 260px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.hint-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
    opacity: 0.7;
    margin-bottom: 8px;
}

.close-btn {
    border: none;
    background: rgba(255, 255, 255, 0.12);
    color: #f5f5f7;
    border-radius: 6px;
    font-size: 11px;
    padding: 2px 7px;
    cursor: pointer;
}

.hint-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.hint-list li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
}

.hint-keys {
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
}

.hint-desc {
    opacity: 0.75;
    text-align: right;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
