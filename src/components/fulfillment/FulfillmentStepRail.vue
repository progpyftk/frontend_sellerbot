<template>
  <nav class="full-step-rail" aria-label="Etapas da criação assistida">
    <button
      v-for="(option, index) in STEP_OPTIONS"
      :key="option.name"
      type="button"
      class="full-step"
      :class="{
        'full-step--active': option.name === current,
        'full-step--done': index < currentIndex,
      }"
      :disabled="index > maxIndex"
      :aria-current="option.name === current ? 'step' : undefined"
      @click="$emit('select', option.name)"
    >
      <span class="full-step__index">
        <q-icon :name="index < currentIndex ? 'check' : option.icon" size="18px" />
      </span>
      <span>
        <strong>{{ index + 1 }}. {{ option.label }}</strong>
        <small>{{ option.helper }}</small>
      </span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { STEP_OPTIONS } from 'src/utils/fulfillmentDraft'

const props = defineProps({
  current: { type: String, required: true },
  maxStep: { type: String, default: 'suggestions' },
})
defineEmits(['select'])

const currentIndex = computed(() => STEP_OPTIONS.findIndex(option => option.name === props.current))
const maxIndex = computed(() => STEP_OPTIONS.findIndex(option => option.name === props.maxStep))
</script>
