import { defineStore } from 'pinia';

// stores/counterState.js
const state = () => ({
  langType: ''
});

// stores/counterActions.js
const actions = {
  fetchLanguage() {

  }
};


export const useLanguageStore = defineStore('language', {
  state,
  actions
});