import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,  // Disable the spinner
  minimum: 0.1,        // Minimum progress
  easing: 'ease',      // Animation easing
  speed: 400,          // Animation speed in ms
  trickleSpeed: 200    // Auto increment speed in ms
})

export const LoadingService = {
  start() {
    NProgress.start()
  },

  done() {
    NProgress.done()
  }
} 