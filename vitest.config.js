const path = require('node:path')
const vue = require('@vitejs/plugin-vue')
const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      // Aliases que o quasar.config.js injeta no build e que alguns módulos usam
      // internamente (ex.: src/stores/store.js importa 'boot/axios').
      boot: path.resolve(__dirname, 'src/boot'),
      stores: path.resolve(__dirname, 'src/stores'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.js'],
  },
})
