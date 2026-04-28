// import FontFaceObserver from 'fontfaceobserver';

export class Preloader {
  async loadAll() {
    return Promise.all([this.loadFonts(), this.loadImages()]);
  }

  // eslint-disable-next-line class-methods-use-this
  private async loadFonts() {
    // 請安裝 FontFaceObserver 套件
    // const fontA = new FontFaceObserver('Gen Jyuu Gothic');
    // const fontB = new FontFaceObserver('lihsianti');
    // return Promise.all([fontA.load(), fontB.load()]);
  }

  private async loadImages() {
    const assetModules = import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,svg,gif}');
    const publicModules = import.meta.glob('/public/im*/**/*.{png,jpg,jpeg,svg,gif}', {
      as: 'url',
    });

    const assetPromises = Object.values(assetModules).map((module) =>
      this.loadImage(module as () => Promise<{ default: string }>),
    );
    const publicPromises = Object.entries(publicModules).map(([url]) =>
      this.loadImage(() => Promise.resolve({ default: url.replace('/public', '') })),
    );

    await Promise.all([...assetPromises, ...publicPromises]);
  }

  // eslint-disable-next-line class-methods-use-this
  private loadImage(moduleLoader: () => Promise<{ default: string }>) {
    return new Promise((resolve, reject) => {
      moduleLoader()
        .then((mod) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Image load failed: ${img.src}`));
          img.src = mod.default;
        })
        .catch(reject);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private async loadSounds() {
    const soundModules = import.meta.glob('/public/sounds/**/*.{mp3,wav}', { as: 'url' });
    const soundPromises = Object.entries(soundModules).map(
      ([url]) =>
        new Promise((resolve, reject) => {
          const audio = new Audio(url.replace('/public', ''));
          audio.addEventListener('canplaythrough', () => resolve(audio));
          audio.addEventListener('error', reject);
          audio.load(); // iOS
        }),
    );
    await Promise.all(soundPromises);
  }
}
