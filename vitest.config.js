const { defineConfig } = require('vitest/config')

module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.js'],
  },
})
