<template>
  <q-dialog v-model="showModal" persistent>
    <q-card class="w-[95vw] max-w-[500px] bg-white rounded-[15px] py-6 px-4">
      <!-- 繪圖區域 -->
      <div class="w-full mb-4">
        <canvas
          ref="canvasRef"
          :width="canvasWidth"
          :height="canvasHeight"
          class="w-full border-2 border-gray-300 rounded-[10px] bg-white cursor-crosshair"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
          @touchstart="startDrawing"
          @touchmove="draw"
          @touchend="stopDrawing">
        </canvas>
      </div>

      <!-- 繪圖工具 -->
      <div class="mb-6 flex justify-center space-x-8">
        <!-- 顏色選擇 -->
        <div class="flex flex-col items-center">
          <p class="text-sm mb-2 text-black">顏色</p>
          <div class="flex items-center gap-3 button">
            <!-- 當前顏色顯示 -->
            <div
              class="w-10 h-10 rounded-full border-2 border-black"
              :style="{ backgroundColor: currentColor }"></div>
          </div>
          <!-- 顏色選擇器彈出框 -->
          <q-menu
            v-model="showColorPicker"
            id="btn-color"
            cover
            anchor="center left"
            self="top left">
            <div>
              <q-color v-model="currentColor" format-model="hex" />
              <button @click="showColorPicker = false" class="w-full">
                <q-icon name="done" size="2rem" />
              </button>
            </div>
          </q-menu>
        </div>

        <!-- 筆刷粗度 -->
        <div class="flex flex-col items-center">
          <p class="text-sm mb-2 text-black">筆刷/橡皮擦粗度</p>
          <div class="flex gap-7 flex-1">
            <button
              v-for="size in brushSizes"
              :key="size.value"
              id="btn-drawing-size"
              class="flex items-center justify-center cursor-pointer"
              :class="{ active: currentBrushSize === size.value }"
              @click="currentBrushSize = size.value">
              <div
                class="rounded-full bg-black"
                :style="{
                  width: `${size.display}px`,
                  height: `${size.display}px`,
                }"></div>
            </button>
          </div>
        </div>

        <!-- 橡皮擦 -->
        <div class="flex flex-col items-center">
          <p class="text-sm mb-2 text-black">橡皮擦</p>
          <button
            @click="toggleEraser"
            id="btn-eraser"
            :class="{ active: isEraser }"
            class="flex-1 flex items-center">
            <svg class="w-[30px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
              <path
                d="M290.7 57.4L57.4 290.7c-25 25-25 65.5 0 90.5l80 80c12 12
              28.3 18.7 45.3 18.7L288 480l9.4 0L512 480c17.7 0 32-14.3
               32-32s-14.3-32-32-32l-124.1 0L518.6 285.3c25-25 25-65.5
                0-90.5L381.3 57.4c-25-25-65.5-25-90.5 0zM297.4 416l-9.4
                 0-105.4 0-80-80L227.3 211.3 364.7 348.7 297.4 416z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 按鈕區域 -->
      <div class="flex justify-between gap-4">
        <ZoomOut
          id="btn-drawing-cancel"
          class="flex-1 py-3 px-6 border border-black rounded-[10px] text-black font-black cursor-pointer hover:bg-gray-50"
          @emit="cancel">
          取消
        </ZoomOut>
        <ZoomOut
          id="btn-drawing-confirm"
          class="flex-1 py-3 px-6 bg-black text-white rounded-[10px] cursor-pointer hover:bg-gray-800"
          @emit="confirm">
          確定
        </ZoomOut>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ZoomOut from 'src/components/ZoomOut.vue';

interface DrawingModalProps {
  modelValue: boolean;
}

interface DrawingModalEmits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', imageData: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<DrawingModalProps>();
const emit = defineEmits<DrawingModalEmits>();

// 響應式資料
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const currentColor = ref('#000000');
const currentBrushSize = ref(6);
const isEraser = ref(false);
const showColorPicker = ref(false);

// 計算屬性
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 畫布尺寸（依照 160:45 比例）
const canvasWidth = ref(480);
const canvasHeight = ref(135);

// 筆刷大小選項
const brushSizes = [
  { value: 6, display: 6 }, // 細
  { value: 15, display: 15 }, // 中
  { value: 24, display: 24 }, // 粗
];

// 繪圖相關方法
const getCanvas = () => canvasRef.value;
const getContext = () => getCanvas()?.getContext('2d');

const getMousePos = (event: MouseEvent | TouchEvent) => {
  const canvas = getCanvas();
  if (!canvas) return { x: 0, y: 0 };

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX;
  let clientY;

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
};

const startDrawing = (event: MouseEvent | TouchEvent) => {
  event.preventDefault();
  isDrawing.value = true;
  const pos = getMousePos(event);
  const ctx = getContext();
  if (!ctx) return;

  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
};

const draw = (event: MouseEvent | TouchEvent) => {
  if (!isDrawing.value) return;
  event.preventDefault();

  const pos = getMousePos(event);
  const ctx = getContext();
  if (!ctx) return;

  ctx.lineWidth = currentBrushSize.value;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isEraser.value) {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor.value;
  }

  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
};

const stopDrawing = () => {
  isDrawing.value = false;
  const ctx = getContext();
  if (ctx) {
    ctx.beginPath();
  }
};

const toggleEraser = () => {
  isEraser.value = !isEraser.value;
};

const clearCanvas = () => {
  const canvas = getCanvas();
  const ctx = getContext();
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

const cancel = () => {
  clearCanvas();
  emit('cancel');
  showModal.value = false;
};

const confirm = () => {
  const canvas = getCanvas();
  if (canvas) {
    const imageData = canvas.toDataURL('image/png');
    emit('confirm', imageData);
  }
  showModal.value = false;
  // 不再清空畫布，保留繪圖內容
};
</script>

<style lang="scss" scoped>
.active {
  position: relative;
  &::before {
    content: '';
    width: 40px;
    height: 40px;
    border: 4px solid #a4a4a4;
    position: absolute;
    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
    border-radius: 50%;
  }
}
</style>
