<template>
  <div
    ref="elementRef"
    :class="{
      flex: Array.isArray(text),
      'items-center': Array.isArray(text),
      'flex-wrap': Array.isArray(text),
      'justify-center': Array.isArray(text),
    }">
    <div v-for="(item, i) in markText" :key="i" class="flex justify-center">
      <div class="text" :class="{ 'mark-text': isCursor, [item.class || '']: !!item.class }">
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, type PropType } from 'vue';

interface TextInterface {
  text: string;
  class?: string;
}
const props = defineProps({
  text: {
    type: [String, Array] as PropType<string | TextInterface[]>,
    default: '',
  },
  speed: {
    type: Number,
  },
  isCursor: {
    type: Boolean,
  },
});
const textList = ref<string[]>([]);
const markText = ref<TextInterface[]>([]);
const elementRef = ref<HTMLElement | null>(null);
const writerSetTimeout = ref<any>(null);
const writeRow = ref(1);

const typeWriter = (row: number, text: string, i: number, speed: number) => {
  if (elementRef.value) {
    const textElement = elementRef.value.getElementsByClassName('text');
    if (i < text.length) {
      markText.value[row].text += text.charAt(i);
      writerSetTimeout.value = setTimeout(() => {
        typeWriter(row, text, i + 1, speed);
      }, speed);
    } else if (writeRow.value < textList.value.length) {
      writeRow.value += 1;

      if (props.isCursor) {
        textElement[writeRow.value - 2].classList.remove('mark-text');
        textElement[writeRow.value - 1].classList.add('mark-text');
      }
      typeWriter(writeRow.value - 1, textList.value[writeRow.value - 1], 0, speed);
    }
  }
};
onMounted(() => {
  textList.value = Array.isArray(props.text)
    ? props.text.map((item) => item.text)
    : props.text.split('\n');
  for (let i = 0; i < textList.value.length; i += 1) {
    if (Array.isArray(props.text)) {
      const object = {
        text: '',
        class: props.text[i].class,
      };
      markText.value.push(object);
    } else {
      const object = {
        text: '',
      };
      markText.value.push(object);
    }
  }
  typeWriter(writeRow.value - 1, textList.value[writeRow.value - 1], 0, props.speed!);
});
onBeforeUnmount(() => {
  if (writerSetTimeout.value) {
    clearTimeout(writerSetTimeout.value);
  }
});
</script>
<style lang="scss" scoped>
@keyframes blink-caret {
  from,
  to {
    border-color: transparent;
  }
  50% {
    border-color: black;
  }
}
.mark-text {
  border-right: 3px solid transparent;
  animation: blink-caret 0.75s step-end infinite;
}
</style>
