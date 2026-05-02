export default defineNuxtConfig({
  ssr: false, // SPA mode — runs inside iframe
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      apiUrl: process.env.API_URL ?? 'http://localhost:3000',
    },
  },

  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],
})
