import { defineStore } from 'pinia';
import { sdk } from 'src/boot/axios';
import * as Sentry from '@sentry/vue';

interface CounterState {
  userCardId: number | null;
  userText: string | null;
  userImage: string | null;
}

export const useCounterStore = defineStore('counter', {
  state: (): CounterState => ({
    userCardId: 1,
    userText: null,
    userImage: null,
  }),
  getters: {},
  actions: {
    reseat() {
      this.userCardId = 1;
      this.userText = null;
      this.userImage = null;
    },
    getName() {
      let result = null;
      switch (this.userCardId) {
        case 1:
          result = '木';
          break;
        case 2:
          result = '金';
          break;
        case 3:
          result = '水';
          break;
        case 4:
          result = '火';
          break;
        case 5:
          result = '土';
          break;
        case 6:
          result = '日';
          break;
        default:
          break;
      }
      return result;
    },
    setUserText(value: string) {
      this.userText = value;
    },
    setUserCardId(value: number) {
      this.userCardId = value;
    },
    setUserGeneratedImage(url: string) {
      this.userImage = url;
    },
    async uploadAndSetImage(imageBase64: string) {
      try {
        const filename = await sdk.uploadImageToServer(imageBase64);
        const imageUrl = `${process.env.IMAGE_API_URL}/images/${filename}`;
        this.setUserGeneratedImage(imageUrl);
      } catch (e) {
        Sentry.captureException(`圖片API上傳失敗:${e}`);
        throw e;
      }
    },
  },
});
