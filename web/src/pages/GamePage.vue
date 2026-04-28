<template>
  <div class="w-full h-full bg-[#868686]">
    <q-img
      no-spinner
      src="~/assets/images/game/bg.png"
      alt="首頁背景"
      class="w-full h-full bg-shadow" />
    <article
      class="game-article absolute z-[2] left-0 top-0 w-full h-full flex flex-col flex-nowrap">
      <GameHeader ref="gameHeaderRef" />
      <div class="flex-1 relative">
        <div class="start relative w-[30%] mx-auto top-[5%]">
          <q-img
            no-spinner
            ref="startButtonRef"
            src="~/assets/images/home/start.png"
            alt="五行運轉按鈕"
            class="w-full opacity-1 transform downloadable"
            :style="{
              transform: `rotate(${currentRotation}deg)`,
              transition: 'none',
            }"
            @mousedown="startLongPress"
            @touchstart="startLongPress"
            @mouseup="endLongPress"
            @touchend="endLongPress"
            @mouseleave="endLongPress" />
          <div
            class="absolute h3 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-center shadow-xl"
            style="
              text-shadow:
                0 0 5px #000000,
                0 0 5px #000000,
                0 0 5px #000000;
            ">
            {{ showContinueText ? '請繼續長按' : '扭轉' }}
          </div>
        </div>
        <GameBox @click="play()" ref="gameBoxRef" id="btn-play" class="button" />
      </div>
    </article>
    <div
      v-if="isText"
      class="w-full px-[20px] absolute bottom-[3%] text-center animate-fade-in"
      :class="{ 'animate-pulse': showPulse }">
      <div class="h2 text-[#000] font-bold">請取出扭蛋</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGtm } from '@gtm-support/vue-gtm';
import { ref, onBeforeUnmount, onMounted } from 'vue';
import { useCounterStore } from 'src/stores/store';
import { useRouter } from 'vue-router';
import GameHeader from 'src/components/GameHeader.vue';
import GameBox from 'src/components/GameBox.vue';
import { GameHeaderInstance, GameBoxInstance } from 'src/types';

const gtm = useGtm();
const store = useCounterStore();
const router = useRouter();

const gameHeaderRef = ref<GameHeaderInstance | null>(null);
const gameBoxRef = ref<GameBoxInstance | null>(null);
const startButtonRef = ref(null);
const isText = ref(false);
const showPulse = ref(false);
// 長按相關狀態
const isPressed = ref(false);
const isRotating = ref(false);
const showContinueText = ref(false);
const remainingTime = ref(2000); // 2秒，以毫秒為單位
const totalRequiredTime = 2000; // 總共需要長按的時間

let pressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStartTime = 0;
let accumulatedTime = 0; // 累積的長按時間
let hasExecuted = false; // 控制最多執行一次

// 追蹤當前的旋轉角度
const currentRotation = ref(0);
const rotationSpeed = ref(180); // 每秒旋轉角度 (360/2=180度/秒)
let lastUpdateTime = 0;

// 處理開始按鈕點擊事件
const handleStartClick = () => {
  if (hasExecuted) return; // 防止重複執行
  if (!gameHeaderRef.value || !gameBoxRef.value) return;

  // 隱藏提示文字
  showContinueText.value = false;

  // 找出最接近底部中心的球體
  const closestBallData = gameHeaderRef.value.findClosestBallToBottom();
  if (!closestBallData) return; // 如果沒有球體，則不執行任何操作

  store.setUserCardId(closestBallData.ball.id);
  const { ball } = closestBallData;

  // 強制球體垂直向下掉落，不受陀螺儀影響
  ball.body.velocity.set(0, -15, 0); // 給予更強的向下速度
  ball.body.angularVelocity.set(0, 0, 0); // 停止旋轉

  // 設置不與任何物體碰撞
  ball.body.collisionFilterGroup = 0;
  ball.body.collisionFilterMask = 0;

  // 標記這個球為正在特殊處理中
  ball.isTransferring = true;

  // 設置一個計時器檢查球體位置
  const checkInterval = setInterval(() => {
    // 檢查球體是否已經掉出容器底部
    if (ball.body.position.y < -15) {
      // containerHeight = 15
      clearInterval(checkInterval);

      // 將球體傳遞給下方盒子
      if (gameBoxRef.value) {
        gameBoxRef.value.receiveBall(ball);
      }
    }
  }, 16); // 約每秒60幀
  setTimeout(() => {
    isText.value = true;
    // 延遲啟動脈動效果，避免與 GameHeader 動畫衝突
    setTimeout(() => {
      showPulse.value = true;
    }, 500);
  }, 2500); // 縮短延遲時間，確保球體動畫完成後再顯示
};

// 使用 CSS 動畫來代替 JavaScript 控制旋轉
// 更新旋轉角度 - 使用時間差來計算角度變化，確保平滑旋轉
const updateRotation = () => {
  if (!isRotating.value) return;

  const now = Date.now();
  const deltaTime = (now - lastUpdateTime) / 1000; // 轉換為秒
  lastUpdateTime = now;

  // 基於時間差和旋轉速度計算角度增量
  const rotationIncrement = rotationSpeed.value * deltaTime;
  currentRotation.value = (currentRotation.value + rotationIncrement) % 360;

  requestAnimationFrame(updateRotation);
};

// 開始長按
const startLongPress = (event: MouseEvent | TouchEvent) => {
  event.preventDefault(); // 防止預設行為

  if (gtm) {
    gtm.trackEvent({
      event: 'manual_button_click',
      click_id: 'btn-start',
    });
  }

  if (hasExecuted) return; // 如果已經執行過，直接返回

  isPressed.value = true;
  showContinueText.value = false;
  pressStartTime = Date.now();
  lastUpdateTime = Date.now();

  // 計算剩餘時間
  remainingTime.value = totalRequiredTime - accumulatedTime;

  // 設置計時器
  pressTimer = setTimeout(() => {
    if (isPressed.value && !hasExecuted) {
      handleStartClick();
      hasExecuted = true; // 標記為已執行
    }
  }, remainingTime.value);

  // 開始旋轉
  isRotating.value = true;
  requestAnimationFrame(updateRotation);
};

// 結束長按
const endLongPress = () => {
  if (!isPressed.value) return;

  isPressed.value = false;
  isRotating.value = false;

  // 計算已經按壓的時間
  const currentTime = Date.now();
  const pressedTime = currentTime - pressStartTime;
  accumulatedTime += pressedTime;

  // 清除計時器
  if (pressTimer) {
    clearTimeout(pressTimer);
  }

  // 如果累積時間不夠5秒且尚未執行，顯示提示
  if (accumulatedTime < totalRequiredTime && !hasExecuted) {
    showContinueText.value = true;
  }
};

const play = () => {
  if (isText.value) {
    // 新增：10% 機率執行特別獎
    if (Math.random() <= 0.1) {
      store.setUserCardId(6);
    }
    router.push({ name: 'PlayPage' });
  }
};

// 組件卸載前清除計時器
onBeforeUnmount(() => {
  if (pressTimer) {
    clearTimeout(pressTimer);
  }
  isRotating.value = false; // 確保動畫停止
});

// 組件掛載時初始化
onMounted(() => {
  currentRotation.value = 0;
  lastUpdateTime = Date.now();
});
</script>

<style scoped>
@keyframes start {
  0% {
    transform: rotateZ(0deg) scale(0);
    opacity: 0;
  }
  100% {
    transform: rotateZ(360deg) scale(1);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.bg-shadow {
  filter: drop-shadow(0 -20px 10px #00000063);
}

@media screen and (min-width: 768px), screen and (orientation: landscape) {
  .game-article {
    top: 0 !important;
    height: 100% !important;
  }
}

.start {
  animation: start 1s linear forwards;
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out forwards;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
