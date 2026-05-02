export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],

  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL ?? 'http://localhost:3000',
    },
  },

  app: {
    head: {
      title: 'Auto-PR Admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
})
