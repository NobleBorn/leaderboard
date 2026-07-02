<template>
  <div class="themed-select" :class="{ open, disabled }" ref="rootEl">
    <button
      type="button"
      class="themed-select-trigger"
      :disabled="disabled"
      @click="toggle"
    >
      <span :class="{ placeholder: !selectedOption }">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <span class="themed-select-chevron">▾</span>
    </button>
    <ul v-if="open" class="themed-select-menu" role="listbox">
      <li
        v-for="opt in options"
        :key="opt.value"
        class="themed-select-option"
        :class="{ active: opt.value === modelValue }"
        role="option"
        @click="select(opt)"
      >
        {{ opt.label }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true }, // [{ value, label }]
  placeholder: { type: String, default: 'Select…' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'change']);

const open = ref(false);
const rootEl = ref(null);

const selectedOption = computed(() => props.options.find(o => o.value === props.modelValue));

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
}

function select(opt) {
  emit('update:modelValue', opt.value);
  emit('change', opt.value);
  open.value = false;
}

function onClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false;
}

onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>
