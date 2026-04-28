<template>
  <div @click="toGame" class="button cursor-pointer relative w-full h-full">
    <img
      src="~/assets/images/home/bg.jpg"
      alt="首頁背景"
      class="w-full h-full absolute top-0 left-0 object-cover" />
    <article
      class="w-full h-full flex flex-col flex-nowrap justify-between items-center space-y-[5%]">
      <div class="relative w-full mb-[30px]">
        <q-img
          no-spinner
          src="~/assets/images/home/title.png"
          alt="五行運轉 扭轉人生"
          class="w-full" />
        <q-img
          no-spinner
          src="~/assets/images/home/egg.png"
          alt="扭轉人生"
          class="w-[22%] absolute bottom-[4%] left-[23%]" />
      </div>
      <div class="relative w-full flex justify-center">
        <div class="w-full h-[9vh]"></div>
        <q-img
          no-spinner
          src="~/assets/images/home/start.png"
          alt="五行運轉按鈕"
          class="w-[90%] opacity-[0.1] absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"
          :class="{ start: type === 3 }" />
        <TypeWriter
          v-if="type === 1"
          class="w-full px-[20px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          :text="[
            {
              text: '宇宙的能量在此',
              class: 'h3 text-[#000] ',
            },
            {
              text: '&nbsp;凝聚',
              class: 'h2 text-green',
            },
            {
              text: '，五行運轉的',
              class: 'h3 text-[#000]',
            },
            {
              text: '&nbsp;神奇力量&nbsp;',
              class: 'h2 text-primary',
            },
            {
              text: ' 等待著您的探索與發現！',
              class: 'h3',
            },
          ]"
          :speed="100"
          :isCursor="true" />
        <TypeWriter
          v-if="type === 2"
          class="w-full px-[20px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          :text="[{ text: '請點擊畫面開始', class: 'h2 text-[#000]' }]"
          :speed="100"
          :isCursor="true" />
      </div>

      <div class="w-[90%] flex-col flex relative">
        <div class="justify-center flex">
          <img src="~/assets/images/home/amulet1.png" alt="健康御守" class="w-[30%] amulet" />
          <img src="~/assets/images/home/amulet2.png" alt="財富御守" class="w-[32.5%] amulet" />
        </div>
        <div class="flex -translate-y-[30%]">
          <img
            src="~/assets/images/home/amulet3.png"
            alt="順利御守"
            style="animation-delay: 0.5s"
            class="w-[33%] relative amulet left-[6%]" />
          <img
            src="~/assets/images/home/amulet4.png"
            alt="好運御守"
            style="animation-delay: 0.75s"
            class="w-[28%] amulet z-[2]" />
          <img
            src="~/assets/images/home/amulet5.png"
            alt="平安御守"
            style="animation-delay: 0.5s"
            class="w-[39%] relative amulet right-[8%]" />
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/vue';
import { useGtm } from '@gtm-support/vue-gtm';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCounterStore } from 'src/stores/store';
import { useGyroscope } from 'src/composables/useGyroscope';
import TypeWriter from 'src/components/TypeWriter.vue';

const gtm = useGtm();
const store = useCounterStore();
const router = useRouter();
const timeout1 = ref<ReturnType<typeof setTimeout> | null>(null);
const timeout2 = ref<ReturnType<typeof setTimeout> | null>(null);
const type = ref(1);

const { requestGyroscopePermission } = useGyroscope();

const init = () => {
  timeout1.value = setTimeout(() => {
    type.value = 2;
  }, 4500);
};

const toGame = async () => {
  if (type.value === 2) {
    type.value = 3;

    if (gtm) {
      gtm.trackEvent({
        event: 'manual_button_click',
        click_id: 'btn-home',
      });
    }

    // 請求陀螺儀權限
    try {
      await requestGyroscopePermission();
    } catch (e) {
      Sentry.captureException(`陀螺儀權限請求失敗:${e}`);
    }

    timeout2.value = setTimeout(() => {
      router.push({ name: 'GamePage' });
    }, 1000);
  }
};

onMounted(() => {
  store.reseat();
  init();
});

onUnmounted(() => {
  if (timeout1.value !== null) {
    clearTimeout(timeout1.value);
    timeout1.value = null;
  }
  if (timeout2.value !== null) {
    clearTimeout(timeout2.value);
    timeout2.value = null;
  }
});
</script>

<style lang="scss" scoped>
@keyframes amulet {
  0% {
    transform: translateY(0%);
  }
  50% {
    transform: translateY(5px);
  }
  100% {
    transform: translateY(0%);
  }
}
@keyframes start {
  0% {
    transform: translate(-50%, -50%) rotateZ(0deg) scale(1);
    opacity: 0.1;
    z-index: 0;
  }
  100% {
    transform: translate(-50%, -50%) rotateZ(360deg) scale(0);
    opacity: 1;
    z-index: 999;
  }
}

.button {
  overflow: hidden;
}

.amulet {
  animation: amulet 1s linear forwards infinite;
}
.start {
  animation: start 1s linear forwards;
}
</style>
