<template>
  <div v-if="events.length" class="events-list">
    <div v-for="event in events" :key="`${event.date}-${event.label}`" class="event-row">
      <div class="event-dot" :class="`event-dot--${event.type || 'default'}`"></div>
      <div class="event-copy"><strong>{{ event.label }}</strong><span>{{ event.date }}<template v-if="event.detail"> · {{ event.detail }}</template></span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ timeline: { type: Object, default: null } })
const events = computed(() => (props.timeline?.series || []).flatMap((row) => {
  const result = []
  if (row.has_promotion) result.push({ date: row.date, label: 'Promoção ativa', type: 'promotion' })
  return result
}))
</script>

<style lang="scss" scoped>
.events-list { display: flex; flex-direction: column; gap: 9px; }
.event-row { display: flex; align-items: center; gap: 9px; }
.event-dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
.event-dot--promotion { background: #f59e0b; }
.event-copy { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.event-copy strong { color: #334155; font-weight: 600; }
.event-copy span { color: #94a3b8; font-size: 11px; }
</style>
