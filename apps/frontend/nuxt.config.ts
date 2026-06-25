export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: { compatibilityVersion: 4 },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@sentry/nuxt/module',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001',
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  ui: {
    colorMode: true,
  },

  routeRules: {
    '/api/**': {
      proxy: `${process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001'}/**`,
    },
  },

  devtools: { enabled: process.env.NODE_ENV === 'development' },
})
