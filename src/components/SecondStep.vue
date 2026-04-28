<template>
  <div class="py-5">
    <div v-if="currentImg" class="w-[80%] h-[20vh] text-center mx-auto mb-3">
      <TypeWriter
        class="w-full"
        :text="[
          {
            text: '星圖已完成了，不夠理想嗎？',
            class: 'p text-[#000] font-bold leading-[1.5]',
          },
          {
            text: '點擊『重新繪製』來探索更深邃的宇宙吧，',
            class: 'p text-[#000] font-bold leading-[1.5]',
          },
          {
            text: '或者清空畫布重新編織你的星辰故事',
            class: 'p text-[#000] font-bold leading-[1.5]',
          },
        ]"
        :speed="100"
        :isCursor="true" />
    </div>
    <h3 v-else class="h3 font-bold leading-[1.5] text-[#000] text-center mb-3">
      星際旅者，留下宇宙印記<br />
      或點擊『切換畫圖』，隨心所欲繪製星圖<br />
    </h3>

    <div v-if="!currentImg" class="w-full flex relative">
      <textarea
        id="textarea"
        v-model="userText"
        rows="3"
        placeholder="限制15字以內，ex:跨越時空與摯愛同行"
        class="w-full p rounded-[10px] font-bold text-[#000] mx-[9%] bg-[#fff] border border-[#929292] mb-5 p-2 text-center resize-none"
        @input="checkTextLength" />
    </div>
    <div class="w-full flex flex-nowrap justify-center space-x-[3%]">
      <div
        v-if="currentImg"
        class="w-[36%] flex flex-nowrap space-x-[7%] md:w-[42%] landscape:w-[42%]">
        <ZoomOut
          id="btn-reset-drawing"
          class="btn w-full cursor-pointer text-white h3 bg-black py-[3%] rounded-[10px]"
          @emit="openDrawingModal()">
          重製
        </ZoomOut>
        <ZoomOut
          id="btn-clean"
          class="btn w-full cursor-pointer text-white h3 bg-black py-[3%] rounded-[10px]"
          @emit="cleanImg()">
          清空
        </ZoomOut>
      </div>
      <ZoomOut
        v-else
        id="btn-change"
        class="btn w-[36%] h3 cursor-pointer text-white bg-black py-[3%] rounded-[10px] md:w-[42%] landscape:w-[42%]"
        @emit="openDrawingModal()">
        切換畫圖
      </ZoomOut>

      <ZoomOut
        id="btn-make"
        class="btn w-[36%] h3 cursor-pointer text-black border border-black py-[3%] md:w-[42%] landscape:w-[42%] font-black rounded-[10px] relative"
        @emit="toResult()">
        確定生成
        <q-img
          no-spinner
          src="~/assets/images/home/star.png"
          alt="星星"
          class="w-[30%] absolute -right-[10%] top-[5%] pointer-events-none -translate-y-1/2" />
      </ZoomOut>
    </div>

    <!-- 畫圖模態視窗 -->
    <DrawingModal
      v-model="showDrawingModal"
      @confirm="handleDrawingConfirm"
      @cancel="handleDrawingCancel" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGtm } from '@gtm-support/vue-gtm';
import TypeWriter from 'src/components/TypeWriter.vue';
import ZoomOut from 'src/components/ZoomOut.vue';
import DrawingModal from './DrawingModal.vue';
import { useCounterStore } from '../stores/store';

// 引入畫圖模態視窗組件

defineProps<{
  cardID: number;
  currentImg: string;
}>();

const store = useCounterStore();
const gtm = useGtm();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'make'): void;
  (e: 'text-change', text: string): void;
  (e: 'img-change', value: string): void;
}>();

const userText = ref('');
const showDrawingModal = ref(false);
const drawingImageData = ref('');

const checkTextLength = () => {
  // 計算行數和實際字數
  const lines = userText.value.split('\n');
  const actualCharCount = userText.value.replace(/\n/g, '').length;

  // 限制最多3行
  if (lines.length > 3) {
    userText.value = lines.slice(0, 3).join('\n');
    return;
  }

  // 限制實際字數為15字
  if (actualCharCount > 15) {
    const chars = Array.from(userText.value);
    let charCount = 0;

    const rebuiltText = chars
      .filter((char) => {
        if (char === '\n') {
          // 換行符不計入字數，保留
          return true;
        }
        if (charCount < 15) {
          // 實際文字字符，且未超過15字限制
          charCount += 1;
          return true;
        }
        // 超過15字的文字字符，過濾掉
        return false;
      })
      .join('');

    userText.value = rebuiltText;
  }

  // 發送文字變更事件到父組件（換行符會在顯示時轉為<br>）
  emit('text-change', userText.value);
};

const openDrawingModal = () => {
  showDrawingModal.value = true;
};

const handleDrawingConfirm = (imageData: string) => {
  drawingImageData.value = imageData;
  // 清空文字輸入，因為用戶選擇了畫圖
  userText.value = '';
  emit('text-change', '');
  emit('img-change', imageData);
};

const handleDrawingCancel = () => {
  drawingImageData.value = '';
};

const GTMEvent = () => {
  const currentText = drawingImageData.value ? null : userText.value;
  const eventData = {
    event: 'lottery_result',
    egg_name: store.getName(),
    user_type: drawingImageData.value ? '繪圖' : '打字',
    text: currentText,
    timestamp: new Date().toISOString(),
  };
  if (gtm) {
    gtm.trackEvent(eventData);
  } else {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(eventData);
  }
};

const toResult = () => {
  // GTM事件
  GTMEvent();
  // 如果有繪圖資料，優先使用繪圖；否則使用文字
  if (drawingImageData.value) {
    store.setUserText(''); // 清空文字
  } else {
    store.setUserText(userText.value);
  }
  emit('make');
};

const cleanImg = () => {
  emit('img-change', '');
};
</script>

<style lang="scss" scoped></style>
