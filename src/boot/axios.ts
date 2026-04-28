import { boot } from 'quasar/wrappers';
import axios, { AxiosInstance } from 'axios';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $imageApi: AxiosInstance;
  }
}

const imageApi = axios.create({ baseURL: process.env.IMAGE_API_URL });

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$imageApi = imageApi;
});

const sdk = {
  async uploadImageToServer(imageBase64: string) {
    const response = await imageApi.post('/api/upload-image', {
      image: imageBase64,
    });

    return response.data.filename;
  },
};

export { imageApi, sdk };
