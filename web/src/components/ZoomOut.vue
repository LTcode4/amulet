<template>
  <button class="text-center" @click="click()" :class="{ btn: isAnimating }">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
  canAnimate: {
    type: Boolean,
    default: true,
  },
  isAudio: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits<{
  emit: [];
}>();

const isAnimating = ref(false);
const route = useRoute();

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const click = async () => {
  if (!props.active) {
    if (props.canAnimate) {
      isAnimating.value = true;
      await delay(500);
      isAnimating.value = false;
    }
    emit('emit');
  }
};

watch(
  () => route.params.id,
  () => {
    isAnimating.value = false;
  },
);
</script>
<style lang="scss" scoped>
@keyframes btnKeyframe {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}
.btn {
  animation-name: btnKeyframe;
  animation-duration: 0.5s;
}
</style>
