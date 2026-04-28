import { reactive, computed } from 'vue';

interface GlowState {
  width: number;
  height: number;
  opacity: number;
}

export function useGlowEffect() {
  const glowState = reactive<GlowState>({
    width: 0,
    height: 0,
    opacity: 0,
  });

  const glowStyle = computed(() => ({
    width: `${glowState.width}px`,
    height: `${glowState.height}px`,
    opacity: glowState.opacity,
  }));

  const showGlow = (duration = 2000) => {
    const startTime = Date.now();
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMd = window.innerWidth >= 768;
    const maxSize = isLandscape || isMd ? window.innerHeight * 0.6 : window.innerWidth * 1.2;

    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const size = progress * maxSize;

      glowState.width = size;
      glowState.height = size;
      glowState.opacity = Math.min(progress * 1.0, 1.0);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const hideGlow = () => {
    glowState.width = 0;
    glowState.height = 0;
    glowState.opacity = 0;
  };

  return {
    glowState,
    glowStyle,
    showGlow,
    hideGlow,
  };
}
