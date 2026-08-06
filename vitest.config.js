const path = require('node:path')
const vue = require('@vitejs/plugin-vue')
const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.js'],
  },
})
