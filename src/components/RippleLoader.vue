<template>
  <div class="ripple-loader" :style="loaderStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  color?: string;
  rippleColor?: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  color: '#ffffff',
  rippleColor: 'rgba(255, 255, 255, 0.3)',
  duration: 1.5,
});

const loaderStyle = computed(() => ({
  '--loader-color': props.color,
  '--ripple-color': props.rippleColor,
  '--animation-duration': `${props.duration}s`,
}));
</script>

<style lang="scss" scoped>
.ripple-loader {
  width: 4vh;
  height: 4vh;
  border-radius: 50%;
  background: var(--loader-color);
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4vh;
    height: 4vh;
    border: 4vh solid var(--ripple-color);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: ripple var(--animation-duration) infinite linear;
  }

  &::before {
    animation-delay: calc(var(--animation-duration) / -3);
  }

  &::after {
    animation-delay: calc(var(--animation-duration) / -1.5);
  }
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}
</style>
