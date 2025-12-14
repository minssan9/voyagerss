import { defineStore } from 'pinia';

interface LayoutState {
  drawerLeft: boolean;
  drawerRight: boolean;
}

export const useLayoutStore = defineStore('layout', {
  state: (): LayoutState => ({
    title: 'Scheduler',
    drawerLeft: true,
    drawerRight: false
  }),
  
  actions: {
    toggleLeftDrawer() {
      this.drawerLeft = !this.drawerLeft;
    },
    toggleRightDrawer() {
      this.drawerRight = !this.drawerRight;
    },
    setLeftDrawer(value: boolean) {
      this.drawerLeft = value;
    },
    setRightDrawer(value: boolean) {
      this.drawerRight = value;
    },
    resetDrawers() {
      this.drawerLeft = false;
      this.drawerRight = false;
    }
  }
}); 