<template>
  <div class="container">
    <canvas ref="canvasRef" class="canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCounterStore } from 'src/stores/store';
import * as THREE from 'three';
import { colors } from 'src/data/balls-message';

const store = useCounterStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const useColor = computed(() => {
  return colors.find((color) => color.id === store.userCardId);
});

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let capsule: THREE.Group;
const stars: THREE.Mesh[] = [];
let hammer: THREE.Group;
let animationId: number | null = null;

// 互動控制變數
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const targetRotation = { x: 0, y: 0 };
const currentRotation = { x: 0, y: 0 };

// 創建扭蛋 - 增強塑膠質感
const createCapsule = (): THREE.Group => {
  const group = new THREE.Group();

  // 上半身（半透明紅色塑膠）
  const topGeometry = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const topMaterial = new THREE.MeshPhongMaterial({
    color: store.userCardId === 6 ? 0x000000 : useColor.value!.color,
    transparent: true,
    opacity: 0.7,
    shininess: 120,
    specular: 0xffffff,
    reflectivity: 0.8,
    // 塑膠感的光澤
    emissive: 0x220000,
    emissiveIntensity: 0.1,
  });
  const topHalf = new THREE.Mesh(topGeometry, topMaterial);

  // 下半身（不透明紅色塑膠）
  const bottomGeometry = new THREE.SphereGeometry(
    1,
    32,
    16,
    0,
    Math.PI * 2,
    Math.PI / 2,
    Math.PI / 2,
  );
  const bottomMaterial = new THREE.MeshPhongMaterial({
    color: store.userCardId === 6 ? 0x000000 : useColor.value!.color,
    shininess: 120,
    specular: 0xffffff,
    reflectivity: 0.9,
    // 塑膠感的光澤
    emissive: 0x110000,
    emissiveIntensity: 0.05,
  });
  const bottomHalf = new THREE.Mesh(bottomGeometry, bottomMaterial);

  group.add(topHalf);
  group.add(bottomHalf);

  return group;
};

// 創建流體感星星 - 縮小2倍
const createStar = (): THREE.Mesh => {
  const starShape = new THREE.Shape();
  const outerRadius = 0.1; // 從 0.4 縮小到 0.2
  const innerRadius = 0.05; // 從 0.2 縮小到 0.1
  const spikes = 5;

  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (i / (spikes * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (i === 0) {
      starShape.moveTo(x, y);
    } else {
      starShape.lineTo(x, y);
    }
  }

  const extrudeSettings = {
    depth: 0.015, // 從 0.15 縮小到 0.075
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 5,
    bevelSize: 0.08, // 從 0.08 縮小到 0.04
    bevelThickness: 0.06, // 從 0.06 縮小到 0.03
  };

  const geometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
  // 流體感材質 - 類似液態金屬
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 150,
    specular: 0xffffff,
    reflectivity: 10,
    transparent: true,
    opacity: 0.9,
    // 流體的微光效果
    emissive: 0xffffff,
    emissiveIntensity: 0.1,
  });

  return new THREE.Mesh(geometry, material);
};

// 創建鐵鎚 - 修正旋轉中心
const createHammer = (): THREE.Group => {
  const group = new THREE.Group();

  // 鎚頭 - 縮小2倍，並調整位置讓木柄底部為旋轉中心
  const headGeometry = new THREE.BoxGeometry(0.65, 0.45, 0.45); // 原本的一半大小
  const headMaterial = new THREE.MeshPhongMaterial({
    color: 0x4a4a4a,
    shininess: 60,
    specular: 0x888888,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  // 調整鎚頭位置：木柄長度的一半 + 鎚頭位置偏移
  head.position.y = 0.45 + 0.3; // 0.45 是木柄長度的一半，0.3 是原本的位置偏移

  // 木質手柄 - 縮小2倍，調整位置讓底部在原點
  const handleGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.9); // 原本的一半大小
  const handleMaterial = new THREE.MeshPhongMaterial({
    color: 0xcd853f, // 溫暖的木色
    shininess: 30,
  });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  // 調整手柄位置：讓手柄的底部在原點，所以向上移動手柄長度的一半
  handle.position.y = 0.45; // 0.9 / 2 = 0.45

  group.add(head);
  group.add(handle);

  return group;
};

// 獲取響應式尺寸（依據容器實際大小）
const getCanvasSize = (): { width: number; height: number } => {
  const container = canvasRef.value?.parentElement;
  const size = container ? Math.min(container.clientWidth, container.clientHeight) : 300;
  return { width: size, height: size };
};

// 初始化場景
const initScene = (): void => {
  if (!canvasRef.value) return;

  // 場景 - 設置為透明背景
  scene = new THREE.Scene();
  // 移除背景顏色，讓場景透明

  // 獲取響應式尺寸
  const { width, height } = getCanvasSize();

  // 相機 - 調整比例為 1:1
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 5);

  // 渲染器 - 啟用透明度和抗鋸齒
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true, // 啟用透明度
  });
  renderer.setSize(width, height); // 響應式尺寸
  renderer.setClearColor(0x000000, 0); // 設置透明背景
  // 移除陰影設定

  // 自然照明設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 更亮的環境光
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffeaa7, 0.6); // 溫暖的陽光色
  directionalLight.position.set(3, 8, 4);
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xa8e6cf, 0.3); // 淡藍色補光
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  // 創建物件
  capsule = createCapsule();
  scene.add(capsule);

  // 創建兩顆星星
  for (let i = 0; i < 3; i += 1) {
    const star = createStar();
    stars.push(star);
    scene.add(star);
  }

  // 創建鐵鎚 - 調整初始位置
  hammer = createHammer();
  // 調整鐵鎚的整體位置，讓它在扭蛋上方適當距離
  hammer.position.set(1.3, 0.1, 0); // 調整位置讓動畫更自然
  scene.add(hammer);
};

// 動畫循環
const animate = (): void => {
  const time = Date.now() * 0.001;

  // 星星圍繞扭蛋運動
  stars.forEach((star, index) => {
    const radius = 1.5;
    const speed = 1 + index * 0.3;
    const heightOffset = Math.sin(time * speed * 2) * 0.5;

    star.position.x = Math.cos(time * speed + index * Math.PI) * radius;
    star.position.z = Math.sin(time * speed + index * Math.PI) * radius;
    star.position.y = heightOffset;

    // 星星自轉
    star.rotation.x += 0.02;
    star.rotation.y += 0.03;
    star.rotation.z += 0.03;
  });

  // 鐵鎚捶打動畫 - 以木柄底部為旋轉中心
  const hammerTime = time * 5; // 稍微放慢速度讓動作更明顯

  // 鐵鎚的擺動角度（以木柄底部為軸心）
  const swingAngle = Math.sin(hammerTime) * 0.5; // 約 35 度的擺動
  hammer.rotation.z = swingAngle;

  // 根據擺動角度計算鐵鎚頭部的位置（用於碰撞檢測）
  const hammerLength = 0.75; // 從旋轉中心到鎚頭的距離
  const hammerHeadX = hammer.position.x + Math.sin(-swingAngle) * hammerLength;
  const hammerHeadY = hammer.position.y + Math.cos(-swingAngle) * hammerLength;

  // 精確碰撞檢測 - 檢查鎚頭是否接近扭蛋
  const distanceToTarget = Math.sqrt(hammerHeadX ** 2 + hammerHeadY ** 2);
  const isColliding = distanceToTarget < 1.3; // 調整碰撞範圍

  if (isColliding) {
    // 強烈的震動效果
    const shakeIntensity = (1.3 - distanceToTarget) * 0.6;
    capsule.position.x = (Math.random() - 0.5) * shakeIntensity;
    capsule.position.y = (Math.random() - 0.5) * shakeIntensity;
    capsule.position.z = (Math.random() - 0.5) * shakeIntensity;
    capsule.rotation.x = (Math.random() - 0.5) * shakeIntensity * 0.7;
    capsule.rotation.z = (Math.random() - 0.5) * shakeIntensity * 0.7;

    // 扭蛋開合動畫 - 更大的開合幅度
    const openAmount = shakeIntensity * 0.6;
    const pulseEffect = Math.sin(time * 15) * 0.1;
    capsule.children[0].position.y = openAmount + pulseEffect;
    capsule.children[1].position.y = -(openAmount + pulseEffect);

    // 增加扭蛋的旋轉開合效果
    capsule.children[0].rotation.x = openAmount * 0.3;
    capsule.children[1].rotation.x = -openAmount * 0.3;
  } else {
    // 平滑回復原位
    capsule.position.x *= 0.82;
    capsule.position.y *= 0.82;
    capsule.position.z *= 0.82;
    capsule.rotation.x *= 0.82;
    capsule.rotation.z *= 0.82;

    // 扭蛋開合回復 - 更快的回復速度
    capsule.children[0].position.y *= 0.75;
    capsule.children[1].position.y *= 0.75;
    capsule.children[0].rotation.x *= 0.75;
    capsule.children[1].rotation.x *= 0.75;
  }

  // 平滑旋轉插值 - 只允許水平旋轉
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;

  // 應用旋轉到相機 - 只有水平360度旋轉
  camera.position.x = Math.sin(currentRotation.y) * 5;
  camera.position.z = Math.cos(currentRotation.y) * 5;
  camera.position.y = 0; // 固定高度
  camera.lookAt(0, 0, 0);

  // 扭蛋緩慢自轉
  capsule.rotation.y += 0.005;

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
};

// 滑鼠事件處理
const handleMouseDown = (event: MouseEvent): void => {
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
};

const handleMouseMove = (event: MouseEvent): void => {
  if (!isDragging) return;

  const deltaMove = {
    x: event.clientX - previousMousePosition.x,
    y: event.clientY - previousMousePosition.y,
  };

  // 只更新水平旋轉
  targetRotation.y += deltaMove.x * 0.01;

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
};

const handleMouseUp = (): void => {
  isDragging = false;
};

// 觸控事件處理
const handleTouchStart = (event: TouchEvent): void => {
  if (event.touches.length === 1) {
    isDragging = true;
    previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  }
};

const handleTouchMove = (event: TouchEvent): void => {
  if (!isDragging || event.touches.length !== 1) return;

  event.preventDefault();

  const deltaMove = {
    x: event.touches[0].clientX - previousMousePosition.x,
    y: event.touches[0].clientY - previousMousePosition.y,
  };

  // 只更新水平旋轉
  targetRotation.y += deltaMove.x * 0.01;

  previousMousePosition = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
  };
};

const handleTouchEnd = (): void => {
  isDragging = false;
};

// 窗口大小調整處理
const handleResize = (): void => {
  if (!renderer || !camera) return;

  const { width, height } = getCanvasSize();

  // 更新相機長寬比
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // 更新渲染器尺寸
  renderer.setSize(width, height);
};

onMounted(() => {
  initScene();
  animate();

  // 事件監聽
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('touchstart', handleTouchStart);
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  // 清理事件監聽
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('touchstart', handleTouchStart);
  window.removeEventListener('touchmove', handleTouchMove);
  window.removeEventListener('touchend', handleTouchEnd);
  window.removeEventListener('resize', handleResize);

  // 清理 Three.js 資源
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  background: transparent; /* 確保 canvas 背景透明 */
}

.canvas:active {
  cursor: grabbing;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-family: 'Arial', sans-serif;
  font-size: 14px;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.controls p {
  margin: 0;
}

@media (max-width: 768px) {
  .controls {
    font-size: 12px;
    padding: 8px 16px;
  }
}
</style>
