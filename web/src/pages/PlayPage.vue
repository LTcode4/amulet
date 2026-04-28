<template>
  <div class="w-full h-full bg-[#fff] overflow-hidden">
    <q-img
      no-spinner
      src="~/assets/images/home/bg.jpg"
      alt="首頁背景"
      class="w-full h-[100vh] object-cover object-bottom min-h-[100dvh] bg-shadow" />

    <!-- Three.js 渲染容器 -->
    <div
      class="absolute z-[2] top-0 overflow-hidden left-0 w-full h-[100%] flex flex-col flex-nowrap">
      <div
        ref="threeContainer"
        class="three-container"
        :class="{ 'scene-scale-animation': sceneScale }" />

      <!-- 發光效果 -->
      <div ref="glowElement" class="glow-effect" :style="glowStyle" />

      <!-- 特殊警告特效 -->
      <div
        v-if="showWarning"
        class="warning-effect absolute z-[99999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div class="text-black text-[12.8vw] md:text-[6.4vh] landscape:text-[6.4vh]">驚！</div>
      </div>

      <!-- 卡片顯示 -->
      <q-img
        no-spinner
        v-if="store.userCardId"
        :src="`/images/cards/${store.userCardId}.png`"
        class="w-[0px] z-[99999] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        :class="{ card: showCard }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/vue';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCounterStore } from 'src/stores/store';
import { colors } from 'src/data/balls-message';
import { useThreeGashapon } from 'src/composables/play/useThreeGashapon';
import { useGlowEffect } from 'src/composables/play/useGlowEffect';

const router = useRouter();
const store = useCounterStore();

// 模板引用
const threeContainer = ref<HTMLDivElement>();
const glowElement = ref<HTMLDivElement>();

// 卡片顯示控制
const showCard = ref(false);
// 警告特效控制
const showWarning = ref(false);
// 場景縮放控制
const sceneScale = ref(false);

// 使用 composables
const { initScene, playAnimation, cleanup } = useThreeGashapon(threeContainer);
const { glowStyle, showGlow } = useGlowEffect();

// Timeout 管理
let animationTimeout: ReturnType<typeof setTimeout> | null = null;
let routerTimeout: ReturnType<typeof setTimeout> | null = null;

// 主要動畫序列
const startGashaponSequence = async () => {
  try {
    // 開始 Three.js 動畫
    await playAnimation();

    // 扭蛋打開瞬間顯示卡片
    showCard.value = true;

    // 顯示發光效果
    showGlow(2000);
  } catch (e) {
    Sentry.captureException(`動畫執行失敗:${e}`);
  }
};

// 組件掛載
onMounted(async () => {
  // 檢查用戶卡片 ID
  if (!store.userCardId) {
    router.push({ name: 'HomePage' });
    return;
  }

  // 特殊處理：如果是 cardId 6，顯示警告特效
  if (store.userCardId === 6) {
    // 顯示警告特效
    showWarning.value = true;

    // 2秒後隱藏警告，然後開始初始化場景
    setTimeout(() => {
      showWarning.value = false;

      // 警告淡出後立即開始初始化場景
      setTimeout(() => {
        // 初始化黑色場景
        initScene({
          color: 0x000000,
          ballRadius: 2,
        });

        // 觸發場景縮放動畫
        sceneScale.value = true;

        // 延遲開始動畫，讓場景有從小變大的效果
        animationTimeout = setTimeout(() => {
          startGashaponSequence();
        }, 1000); // 給場景更多時間展示從小變大的效果
      }, 500); // 淡出動畫完成後
    }, 3000); // 警告顯示3秒（1秒彈出 + 2秒顯示）
  } else {
    // 原有邏輯：正常處理其他 cardId
    const cardColor = colors.find((color) => color.id === store.userCardId);
    if (!cardColor) {
      return;
    }

    // 初始化 Three.js 場景
    initScene({
      color: cardColor.color,
      ballRadius: 2,
    });

    // 延遲開始動畫
    animationTimeout = setTimeout(() => {
      startGashaponSequence();
    }, 500);
  }

  // 設定路由跳轉計時器
  routerTimeout = setTimeout(
    () => {
      router.push({ name: 'MakePage' });
    },
    store.userCardId === 6 ? 15000 : 10000,
  );
});

// 組件卸載
onUnmounted(() => {
  // 清除計時器
  if (animationTimeout) {
    clearTimeout(animationTimeout);
    animationTimeout = null;
  }
  if (routerTimeout) {
    clearTimeout(routerTimeout);
    routerTimeout = null;
  }
  // 清理 Three.js 資源
  cleanup();
});
</script>

<style scoped lang="scss">
@keyframes zoom-in {
  0% {
    width: 0px;
  }
  100% {
    width: 75%;
  }
}

.three-container {
  width: 100%;
  height: 100%;
}

.scene-scale-animation {
  animation: scene-scale-up 1s ease-out forwards;
}

@keyframes scene-scale-up {
  0% {
    transform: scale(0.1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 153, 0.98) 0%,
    rgba(255, 255, 102, 0.9) 10%,
    rgba(255, 255, 51, 0.8) 25%,
    rgba(255, 255, 0, 0.6) 40%,
    rgba(255, 255, 0, 0) 70%,
    transparent 100%
  );
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  pointer-events: none;
  filter: blur(1px);
  transition: none;
}

.card {
  animation: zoom-in 3s forwards;
}

.warning-effect {
  animation: warning-sequence 3.5s ease-out forwards;
}

@keyframes warning-sequence {
  /* 彈出階段：0-1秒 */
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  28.6% {
    /* 1秒/3.5秒 = 28.6% */
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  /* 顯示階段：1-3秒，同時發光 */
  28.6%,
  85.7% {
    /* 3秒/3.5秒 = 85.7% */
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
    text-shadow:
      0 0 15px rgba(255, 255, 0, 0.6),
      0 0 25px rgba(255, 255, 0, 0.6),
      0 0 35px rgba(255, 255, 0, 0.6),
      0 0 45px rgba(255, 255, 0, 0.6);
  }
  /* 淡出階段：3-3.5秒 */
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1);
    text-shadow:
      0 0 10px rgba(255, 255, 0, 0.6),
      0 0 20px rgba(255, 255, 0, 0.6),
      0 0 30px rgba(255, 255, 0, 0.6),
      0 0 40px rgba(255, 255, 0, 0.6);
  }
}
</style>
