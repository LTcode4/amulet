<template>
  <div class="bg-cover bg-center relative w-full h-full overflow-hidden">
    <q-img
      no-spinner
      src="~/assets/images/result/bg.jpg"
      alt="首頁背景"
      class="w-full h-full min-h-[100dvh]" />
    <div
      class="w-full pb-[5%] flex flex-col flex-nowrap justify-between absolute bottom-0 left-0 h-full items-center">
      <q-img
        no-spinner
        src="~/assets/images/result/title.png"
        alt="圖片生成成功"
        class="w-full mt-[4.6dvh] min-h-[calc((85.422/667)*100dvh)]" />
      <div
        v-if="store.userImage"
        class="flex-1 min-h-0 max-w-[80.8%] flex justify-center items-center mt-[11px] md:w-[80.8%] md:flex-none md:h-auto landscape:w-[80.8%] landscape:flex-none landscape:h-auto">
        <img
          :src="store.userImage"
          alt="結果御守"
          id="btn-download-img"
          class="shadow w-full downloadable" />
        <p v-if="isLineApp()" class="mt-2">可長按下載圖片</p>
      </div>
      <article class="w-[81%] flex justify-center items-center min-h-[calc((96.734/667)*100dvh)]">
        <div class="w-full space-y-5">
          <ZoomOut
            id="btn-share"
            @emit="share()"
            class="btn share relative h3 w-full cursor-pointer text-white bg-black p-[5%] rounded-[10px]">
            分享
          </ZoomOut>
          <div class="w-full flex flex-nowrap items-center justify-center space-x-5">
            <ZoomOut
              id="btn-go-home"
              class="btn w-full h3 cursor-pointer text-white bg-black py-[3%] rounded-[10px]"
              @emit="toHome()">
              回至首頁
            </ZoomOut>
            <ZoomOut
              v-if="!isLineApp()"
              id="btn-download"
              class="btn w-full h3 cursor-pointer text-black border border-black font-black py-[3%] rounded-[10px] relative"
              @emit="download()">
              下載
              <q-img
                no-spinner
                src="~/assets/images/home/star.png"
                alt="星星"
                class="w-[30%] absolute -right-[13px] top-[5px] pointer-events-none -translate-y-1/2" />
            </ZoomOut>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
<script setup lang="ts">
import * as Sentry from '@sentry/vue';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCounterStore } from 'src/stores/store';
import ZoomOut from 'src/components/ZoomOut.vue';
import { colors } from 'src/data/balls-message';

const store = useCounterStore();
const router = useRouter();
const useColor = computed(() => {
  return colors.find((color) => color.id === store.userCardId);
});
const toHome = () => {
  router.push({ name: 'HomePage' });
};
const share = async () => {
  const text = '點擊連結啟動命運密碼！五行運轉穿越時空，扭轉未來人生軌跡。';
  const dataURL = store.userImage;
  const blob = await (await fetch(dataURL as string)).blob();
  const imageUrl = [new File([blob], 'image.png', { type: 'image/png' })];
  const url = `${window.location.origin}?openExternalBrowser=1`;
  if (navigator.share) {
    const shareData = {
      text,
      url,
      files: imageUrl,
    };
    await navigator
      .share(shareData)
      .then()
      .catch((e) => {
        Sentry.captureException(`分享失敗:${e}`);
      });
  }
};

const isLineApp = () => {
  return /Line/i.test(navigator.userAgent);
};

const download = () => {
  const a = document.createElement('a');
  if (store.userImage) {
    a.href = store.userImage;
    a.download = `${useColor.value ? useColor.value.name : '專屬御守'}.png`;
    a.click();
  }
};
onMounted(() => {
  if (!store.userImage) {
    toHome();
  }
});
</script>
<style lang="scss" scoped>
.share::before {
  content: '';
  position: absolute;
  width: calc(100% - 5px);
  height: calc(100% - 5px);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid #fff;
  border-radius: 10px;
}
</style>
