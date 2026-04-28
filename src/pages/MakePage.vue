<template>
  <div class="w-full h-full overflow-hidden">
    <q-img
      no-spinner
      src="~/assets/images/home/bg.jpg"
      alt="首頁背景"
      class="w-full h-full min-h-[100dvh]" />
    <!-- 載入中遮罩 -->
    <div
      v-if="isLoading"
      class="w-full h-full flex justify-center absolute bottom-0 left-0 items-center z-50">
      <LoadingIcon />
    </div>

    <!-- 主要內容區域 - 不使用 v-else，確保 DOM 元素始終存在 -->
    <div
      class="w-full overflow-hidden flex flex-col flex-nowrap justify-between absolute bottom-0 left-0 h-full items-center space-y-1"
      :class="{ 'opacity-0 pointer-events-none': isLoading }">
      <q-img no-spinner src="~/assets/images/make/title.png" alt="您的御守" class="w-full" />
      <div
        ref="captureArea"
        class="w-[70%] h-auto md:w-[70%] md:h-auto landscape:w-[70%] landscape:h-auto z-10 relative [container-type:inline-size]">
        <q-img
          ref="baseImage"
          :src="`/images/result/${store.userCardId}.jpg`"
          alt="扭蛋御守"
          class="shadow w-full z-10"
          @load="onBaseImageLoad" />
        <img
          v-if="currentImg"
          ref="overlayImage"
          :src="currentImg"
          alt="繪圖"
          class="w-[53%] absolute z-10 bottom-[13%] h-[15%] left-1/2 -translate-x-1/2 high-quality-image"
          @load="onImageLoad" />
        <div
          v-else
          ref="overlayText"
          class="w-[53%] absolute z-10 bottom-[13%] h-[15%] left-1/2 -translate-x-1/2 text-[4.2cqw] text-center text-black font-bold flex items-center justify-center"
          v-html="currentText.replace(/\n/g, '<br>')"></div>
      </div>
      <div class="w-full relative">
        <q-img
          no-spinner
          src="~/assets/images/home/start.png"
          alt="使用者操作區域"
          class="w-[150%] absolute -translate-x-1/2 aspect-auto -translate-y-[20%] left-1/2 top-0 opacity-[0.1]" />
        <SecondStep
          class="w-full relative"
          :cardID="cardID"
          :currentImg="currentImg"
          @back="back"
          @text-change="updateCurrentText"
          @img-change="updateCurrentImg"
          @make="make" />
      </div>
    </div>

    <!-- 隱藏的 Canvas 用於截圖 - 移到外層確保始終存在 -->
    <canvas
      ref="canvas"
      style="display: none; position: absolute; top: -9999px; left: -9999px"></canvas>
  </div>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/vue';
import { useQuasar } from 'quasar';
import { ref, nextTick, onUnmounted, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCounterStore } from 'src/stores/store';
import SecondStep from 'src/components/SecondStep.vue';
import LoadingIcon from 'src/components/LoadingIcon.vue';

const store = useCounterStore();
const $q = useQuasar();
const router = useRouter();
const step = ref(1);
const cardID = ref(1);
const currentText = ref('');
const currentImg = ref('');
const isLoading = ref(false);

const captureArea = ref<HTMLDivElement>();
const baseImage = ref();
const overlayImage = ref<HTMLImageElement>();
const overlayText = ref<HTMLParagraphElement>();
const canvas = ref<HTMLCanvasElement>();
const screenshotDataUrl = ref('');

const totalImages = ref(1); // 基礎圖片數量
const loadedImages = ref(0); // 已載入的圖片數量

let routerTimeout: ReturnType<typeof setTimeout> | null = null;

// 圖片載入完成的處理函數
const onBaseImageLoad = () => {
  loadedImages.value = Math.max(loadedImages.value, 1);
};

const onImageLoad = () => {
  if (currentImg.value) {
    loadedImages.value = 2;
  }
};

// 等待所有圖片載入完成
const waitForImagesLoad = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkImages = () => {
      if (loadedImages.value >= totalImages.value) {
        resolve();
        return;
      }
      setTimeout(checkImages, 100);
    };
    checkImages();
  });
};

const updateCurrentText = (text: string) => {
  currentText.value = text;
};

const updateCurrentImg = (value: string) => {
  currentImg.value = value;
  if (value) {
    totalImages.value = 2; // 有覆蓋圖片時總數為2
    loadedImages.value = 1; // 重置載入狀態，只有基礎圖片載入完成
  } else {
    totalImages.value = 1; // 只有基礎圖片時總數為1
    loadedImages.value = 1; // 基礎圖片已載入
  }
};

// 載入圖片並轉換為 Canvas
const loadImageToCanvas = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 處理跨域問題
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = src;
  });
};

// 將文字繪製到 Canvas 上（支援中英混合自動換行）
const drawTextOnCanvas = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  targetWidth: number,
) => {
  if (!text) return;

  // 獲取實際 DOM 元素的完整樣式來保持一致性
  let actualFontSize = 12; // 預設值
  let letterSpacing = 0;
  let wordSpacing = 0;
  let fontFamily = 'JF, "Noto Sans TC", sans-serif';
  let fontWeight = 'bold';

  if (overlayText.value) {
    const computedStyle = window.getComputedStyle(overlayText.value);
    actualFontSize = parseFloat(computedStyle.fontSize) || 12;
    letterSpacing = parseFloat(computedStyle.letterSpacing) || 0;
    wordSpacing = parseFloat(computedStyle.wordSpacing) || 0;
    fontFamily = computedStyle.fontFamily || fontFamily;
    fontWeight = computedStyle.fontWeight || fontWeight;
  }

  // 根據 Canvas 尺寸縮放字體大小和間距
  const scaleFactor = targetWidth / 300; // 300 是原始設計寬度
  const fontSize = actualFontSize * scaleFactor;
  const scaledLetterSpacing = letterSpacing * scaleFactor;
  const scaledWordSpacing = wordSpacing * scaleFactor;

  // 設定文字樣式（與 CSS 完全保持一致）
  ctx.fillStyle = '#000000';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 設定字距和詞距（如果瀏覽器支援）
  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = `${scaledLetterSpacing}px`;
  }
  if ('wordSpacing' in ctx) {
    (ctx as any).wordSpacing = `${scaledWordSpacing}px`;
  }

  const isEnglishChar = (char: string): boolean => {
    return /[a-zA-Z]/.test(char);
  };

  const isWhitespace = (char: string): boolean => {
    return /\s/.test(char);
  };

  const isPunctuation = (char: string): boolean => {
    return /[.,!?;:，。！？；：]/.test(char);
  };

  // 精確測量文字寬度（考慮字距和詞距）
  const measureTextWidth = (inputText: string): number => {
    let textWidth = ctx.measureText(inputText).width;

    // 手動添加字距效果（如果瀏覽器不支援 letterSpacing）
    if (scaledLetterSpacing !== 0 && !('letterSpacing' in ctx)) {
      const chars = Array.from(inputText);
      textWidth += (chars.length - 1) * scaledLetterSpacing;
    }

    // 手動添加詞距效果（如果瀏覽器不支援 wordSpacing）
    if (scaledWordSpacing !== 0 && !('wordSpacing' in ctx)) {
      const words = inputText.split(/\s+/);
      if (words.length > 1) {
        textWidth += (words.length - 1) * scaledWordSpacing;
      }
    }

    return textWidth;
  };

  // 智能換行函數（精確模擬瀏覽器行為）
  const wrapText = (inputText: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    const paragraphs = inputText.split('\n');

    paragraphs.forEach((paragraph) => {
      if (!paragraph.trim()) {
        lines.push('');
        return;
      }

      let currentLine = '';
      const chars = Array.from(paragraph);
      let i = 0;

      while (i < chars.length) {
        const char = chars[i];
        const testLine = currentLine + char;
        const testWidth = measureTextWidth(testLine);

        // 如果當前字符加入後超出寬度
        if (testWidth > maxWidth && currentLine.length > 0) {
          // 智能斷行邏輯
          let breakPoint = currentLine.length;

          // 如果當前字符是英文，嘗試找到更好的斷點
          if (isEnglishChar(char)) {
            // 向前尋找空格或標點符號作為斷點
            for (
              let j = currentLine.length - 1;
              j >= Math.max(0, currentLine.length - 10);
              j -= 1
            ) {
              const prevChar = currentLine[j];
              if (isWhitespace(prevChar) || isPunctuation(prevChar)) {
                breakPoint = j + 1;
                break;
              }
            }
          }

          // 執行斷行
          if (breakPoint < currentLine.length) {
            // 在找到的斷點處斷行
            lines.push(currentLine.substring(0, breakPoint).trim());
            currentLine = currentLine.substring(breakPoint).trim() + char;
          } else {
            // 沒找到合適斷點，直接斷行
            lines.push(currentLine);
            currentLine = char;
          }
        } else {
          currentLine = testLine;
        }

        i += 1;
      }

      // 添加最後一行
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    });

    return lines;
  };

  // 使用與預覽相同的可用寬度（100% 而不是 90%）
  const maxTextWidth = width;

  // 獲取自動換行後的所有行
  const wrappedLines = wrapText(text, maxTextWidth);

  // 計算行高（與 CSS line-height 保持一致）
  const lineHeight = fontSize * 1.2;
  const totalHeight = wrappedLines.length * lineHeight;
  const startY = y + height / 2 - totalHeight / 2;

  // 繪製每一行文字
  wrappedLines.forEach((line, index) => {
    if (line.trim()) {
      // 只繪製非空行
      const lineY = startY + (index + 0.5) * lineHeight;

      // 如果瀏覽器不支援 letterSpacing/wordSpacing，手動繪製每個字符
      if (
        (scaledLetterSpacing !== 0 && !('letterSpacing' in ctx)) ||
        (scaledWordSpacing !== 0 && !('wordSpacing' in ctx))
      ) {
        const chars: string[] = Array.from(line);
        const totalWidth = measureTextWidth(line);
        let currentX = x + width / 2 - totalWidth / 2;

        for (let charIndex = 0; charIndex < chars.length; charIndex += 1) {
          const char = chars[charIndex] as string;
          const charWidth = ctx.measureText(char).width;
          ctx.fillText(char, currentX + charWidth / 2, lineY);
          currentX += charWidth;

          // 添加字距
          if (charIndex < chars.length - 1) {
            if (isWhitespace(char)) {
              currentX += scaledWordSpacing;
            } else {
              currentX += scaledLetterSpacing;
            }
          }
        }
      } else {
        // 瀏覽器支援 letterSpacing/wordSpacing，直接繪製
        ctx.fillText(line, x + width / 2, lineY);
      }
    }
  });
};

// 主要截圖功能（固定 600x600 尺寸）
const captureAreaAsImage = async (): Promise<string> => {
  // 直接檢查 DOM 元素，不再等待
  if (!captureArea.value || !canvas.value) {
    throw new Error('DOM 元素未準備就緒');
  }

  const ctx = canvas.value.getContext('2d');
  if (!ctx) {
    throw new Error('無法獲取 Canvas 2D 上下文');
  }

  // 固定輸出尺寸為 600x600
  const targetWidth = 600;
  const targetHeight = 600;
  const actualScale = 1; // 固定為 1，不使用裝置像素比

  // 設定 Canvas 的實際尺寸（固定 600x600）
  const canvasWidth = targetWidth * actualScale;
  const canvasHeight = targetHeight * actualScale;

  canvas.value.width = canvasWidth;
  canvas.value.height = canvasHeight;

  // 設定 Canvas 的顯示尺寸
  canvas.value.style.width = `${targetWidth}px`;
  canvas.value.style.height = `${targetHeight}px`;

  // 縮放繪圖上下文
  ctx.scale(actualScale, actualScale);

  // 設定高品質渲染
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 載入基礎圖片
  try {
    const baseImg = await loadImageToCanvas(`/images/result/${store.userCardId}.jpg`);
    ctx.drawImage(baseImg, 0, 0, targetWidth, targetHeight);
  } catch (e) {
    Sentry.captureException(
      `載入/images/result/${store.userCardId}.jpg圖片並轉換為 Canvas 失敗:${e}`,
    );
  }
  // 如果有覆蓋圖片，載入並繪製（不加陰影）
  if (currentImg.value) {
    try {
      const overlayImg = await loadImageToCanvas(currentImg.value);
      // 計算覆蓋圖片的位置和尺寸
      const overlayWidth = targetWidth * 0.53;
      const overlayHeight = targetHeight * 0.15;
      const overlayX = (targetWidth - overlayWidth) / 2; // 水平居中
      const overlayY = targetHeight * 0.72; // 底部 13% 的位置

      // 設定高品質圖片渲染
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(overlayImg, overlayX, overlayY, overlayWidth, overlayHeight);
    } catch (e) {
      Sentry.captureException(`載入${currentImg.value}圖片並轉換為 Canvas 失敗:${e}`);
    }
  } else if (currentText.value) {
    // 如果有文字，繪製文字
    const textWidth = targetWidth * 0.53;
    const textHeight = targetHeight * 0.15;
    const textX = (targetWidth - textWidth) / 2;
    const textY = targetHeight * 0.72;

    drawTextOnCanvas(ctx, currentText.value, textX, textY, textWidth, textHeight, targetWidth);
  }

  // 最後為整個圖片加上陰影效果
  const shadowCanvas = document.createElement('canvas');
  const shadowCtx = shadowCanvas.getContext('2d')!;
  shadowCanvas.width = canvasWidth;
  shadowCanvas.height = canvasHeight;
  shadowCtx.scale(actualScale, actualScale);

  // 設定陰影
  shadowCtx.shadowColor = 'rgba(0, 0, 0, 0.44)';
  shadowCtx.shadowBlur = 5 * actualScale;
  shadowCtx.shadowOffsetX = 5 * actualScale;
  shadowCtx.shadowOffsetY = 5 * actualScale;

  // 將完整圖片繪製到陰影 Canvas
  shadowCtx.drawImage(canvas.value, 0, 0, targetWidth, targetHeight);

  // 轉換為壓縮的 JPEG 圖片
  return shadowCanvas.toDataURL('image/jpeg', 0.9);
};

const back = () => {
  if (step.value === 1) {
    router.push({ name: 'HomePage' });
  } else {
    step.value = 1;
  }
};

const make = async () => {
  if (!captureArea.value || !canvas.value) {
    $q.notify({
      type: 'warning',
      message: '系統錯誤，請重新整理頁面',
    });
    return;
  }

  isLoading.value = true;

  await nextTick();
  try {
    await waitForImagesLoad();
  } catch (e) {
    Sentry.captureException(`等待所有圖片載入錯誤:${e}`);
  }
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 200);
  });

  // 執行截圖
  try {
    screenshotDataUrl.value = await captureAreaAsImage();
  } catch (e) {
    Sentry.captureException(`截圖功能失敗:${e}`);
  }
  // 將截圖存入 store
  await store.uploadAndSetImage(screenshotDataUrl.value);
  // 預載入用戶圖片
  const preloadUserImage = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!store.userImage) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        resolve();
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = store.userImage;
    });
  };
  await preloadUserImage();
  routerTimeout = setTimeout(() => {
    isLoading.value = false;
    // 導航到結果頁面
    router.push({ name: 'ResultPage' });
  }, 5000);
};

onMounted(() => {
  // 初始化時設定基礎圖片已載入
  loadedImages.value = 1;
});

onUnmounted(() => {
  if (routerTimeout) {
    clearTimeout(routerTimeout);
    routerTimeout = null;
  }
});
</script>

<style lang="scss" scoped>
.shadow {
  box-shadow: 10px 10px 10px #00000070;
}

.high-quality-image {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: -moz-crisp-edges;
  image-rendering: pixelated;
  image-rendering: smooth;
  image-rendering: auto;
  image-rendering: high-quality;
  -ms-interpolation-mode: bicubic;
}
</style>
