<template>
  <q-layout>
    <q-page-container class="app-container">
      <router-view v-slot="{ Component }">
        <component v-if="isLoaded" :is="Component" class="w-full flex-grow" />
        <div v-else>
          <div
            class="absolute top-0 left-0 w-full h-full bg-[#00000080] flex justify-center items-center">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <RippleLoader color="white" ripple-color="rgba(255,255,255,0.5)" :durantion="1" />
            </div>
            <img src="~assets/images/home/egg.png" class="ld ld-bounce-in infinite w-[12%]" />
            <div
              class="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex flex-nowrap items-center gap-x-2">
              <h3 class="text-white h3 font-bold mb-1">Loading</h3>
              <q-spinner-dots color="white" size="1.5em" />
            </div>
          </div>
        </div>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/vue';
import { ref, onMounted } from 'vue';
import { Preloader } from 'src/utils/preloader';
import RippleLoader from 'src/components/RippleLoader.vue';

const isLoaded = ref(false);

onMounted(async () => {
  const preloader = new Preloader();
  await preloader.loadAll().catch((e: Error) => {
    Sentry.captureException(`預載入失敗:${e}`);
  });
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1500);
  });
  isLoaded.value = true;
});
</script>

<style lang="scss">
$main-bg-color: white;
$secondary-bg-color: white;

body {
  background: $secondary-bg-color;
  color: black;
  font-size: 20px;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0em;
  text-align: center;
}

.main-bg {
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}

.app-container {
  background: $main-bg-color;
  width: calc(90vh * 9 / 16);
  height: 90vh;
  border: 1px solid #888;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.5);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  > div {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }
}

@media screen and (max-width: 767px) and (orientation: portrait) {
  .app-container {
    background: $main-bg-color;
    border: none;
    box-shadow: none;
    width: 100vw;
    height: 100vh;
    max-height: 100dvh;
    transform: none;
    top: 0;
    left: 0;
  }
}
</style>
