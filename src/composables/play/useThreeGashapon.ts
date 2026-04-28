import { ref, type Ref } from 'vue';
import * as THREE from 'three';

export interface GashaponConfig {
  color: number;
  ballRadius?: number;
}

export function useThreeGashapon(container: Ref<HTMLDivElement | undefined>) {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let gashaponTop: THREE.Mesh;
  let gashaponBottom: THREE.Mesh;
  let animationId: number;

  const isAnimating = ref(false);
  const rotationComplete = ref(false);

  // 創建方格紋理
  const createGridTexture = (color: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const mainColor = new THREE.Color(color);
    const darkerColor = mainColor.clone().multiplyScalar(0.5);
    const gridSize = 64;

    for (let x = 0; x < 512; x += gridSize) {
      for (let y = 0; y < 512; y += gridSize) {
        const isEven = ((x + y) / gridSize) % 2 === 0;
        ctx.fillStyle = isEven ? darkerColor.getStyle() : mainColor.getStyle();
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }

    return new THREE.CanvasTexture(canvas);
  };

  // 創建扭蛋幾何體
  const createGashapon = (config: GashaponConfig) => {
    const radius = config.ballRadius || 2;

    // 上半部 - 透明
    const topGeometry = new THREE.SphereGeometry(radius, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const topMaterial = new THREE.MeshPhongMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.5,
      shininess: 70,
    });
    gashaponTop = new THREE.Mesh(topGeometry, topMaterial);
    scene.add(gashaponTop);

    // 下半部 - 紋理
    const bottomGeometry = new THREE.SphereGeometry(
      radius,
      32,
      32,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    );
    const texture = createGridTexture(config.color);
    const bottomMaterial = new THREE.MeshPhongMaterial({ map: texture, shininess: 70 });
    gashaponBottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    scene.add(gashaponBottom);
  };

  // 渲染循環
  const startRenderLoop = () => {
    const render = () => {
      animationId = requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();
  };

  // 初始化場景
  const initScene = (config: GashaponConfig) => {
    if (!container.value) return;

    // 創建場景和相機
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      container.value.clientWidth / container.value.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 8);

    // 創建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(container.value.clientWidth, container.value.clientHeight);
    renderer.shadowMap.enabled = true;
    container.value.appendChild(renderer.domElement);

    // 添加光源
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 創建扭蛋
    createGashapon(config);
    startRenderLoop();
  };

  // 創建扭蛋幾何體 - 移除這個重複的函數定義
  // 創建方格紋理 - 移除這個重複的函數定義

  // 旋轉動畫
  const rotateGashapon = async () => {
    const duration = 2000;
    const startTime = Date.now();

    return new Promise<void>((resolve) => {
      const animate = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const angle = progress * Math.PI * 2;

        gashaponTop.rotation.y = angle;
        gashaponBottom.rotation.y = angle;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          rotationComplete.value = true;
          resolve();
        }
      };
      animate();
    });
  };

  // 開啟動畫
  const openGashapon = async (onStartOpening?: () => void) => {
    const duration = 3000;
    const startTime = Date.now();
    let hasTriggeredCallback = false;

    return new Promise<void>((resolve) => {
      const animate = () => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const easeProgress =
          progress < 0.5 ? 4 * progress * progress * progress : 1 - (-2 * progress + 2) ** 3 / 2;

        // 當扭蛋開始分離時觸發回調（進度 > 0.1 時）
        if (progress > 0.1 && !hasTriggeredCallback && onStartOpening) {
          hasTriggeredCallback = true;
          onStartOpening();
        }

        gashaponTop.position.y = easeProgress * 3;
        gashaponTop.rotation.z = easeProgress * Math.PI * 0.2;
        gashaponBottom.position.y = -easeProgress * 2.5;
        gashaponBottom.rotation.z = -easeProgress * Math.PI * 0.25;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  };

  // 主動畫流程
  const playAnimation = async (onStartOpening?: () => void) => {
    if (isAnimating.value) return;
    isAnimating.value = true;

    try {
      await rotateGashapon();
      await openGashapon(onStartOpening);
    } finally {
      isAnimating.value = false;
    }
  };

  // 渲染循環 - 移除重複定義

  // 清理資源
  const cleanup = () => {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
  };

  return {
    initScene,
    playAnimation,
    cleanup,
    isAnimating,
    rotationComplete,
  };
}
