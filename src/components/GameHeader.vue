<template>
  <div class="h-[40%] w-full relative">
    <canvas ref="canvasRef" class="!w-full !h-full"></canvas>
    <div class="absolute w-full h-full top-0 left-0 glass"></div>
    <q-img
      no-spinner
      src="~/assets/images/game/title.png"
      alt="五行運轉 扭轉人生"
      class="absolute top-[25%] left-0 w-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getRandomColor } from 'src/data/balls-message';
import { useGyroscope } from 'src/composables/useGyroscope';

type Ball = {
  id: number;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  innerSquare?: THREE.Mesh;
  isTransferring?: boolean;
};

// 使用陀螺儀 composable
const { hasPermission, enableGyroscope, isIOS } = useGyroscope();

// 裝置狀態相關參考
const hasGyroscopePermission = hasPermission;

// 畫布參考
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 場景設定
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let world: CANNON.World;
let lastTime = 0;
let nextBallTimer = 0; // 計時器用於定時生成球體
let ballsToAdd = 20; // 初始要添加的球體數量

// 球體及其物理體的集合
const balls: Ball[] = [];

// 物理牆壁參考
let frontWallBody: CANNON.Body | null = null;
let backWallBody: CANNON.Body | null = null;
let leftWallBody: CANNON.Body | null = null;
let rightWallBody: CANNON.Body | null = null;
let floorBody: CANNON.Body | null = null;
let ceilingBody: CANNON.Body | null = null;

// 視覺牆壁參考 - 改為使用個別的平面而非線框
let wallMeshes: THREE.Mesh[] = [];

// 容器尺寸，根據畫布比例調整
let containerWidth = 8;
const containerHeight = 15;
let containerDepth = 8;

// 球體大小（80px對應的Three.js單位）
const ballRadius = 2;

// 檢測是否為iOS裝置
const detectIOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

// 處理陀螺儀事件
const handleOrientation = (event: DeviceOrientationEvent) => {
  if (event.beta === null || event.gamma === null) return;

  // 根據陀螺儀數據調整重力方向
  // iOS和其他平台的座標系統可能不同，需要調整
  const beta = (event.beta * Math.PI) / 180; // x軸旋轉 (前後傾斜)
  const gamma = (event.gamma * Math.PI) / 180; // y軸旋轉 (左右傾斜)

  let gravityX;
  let gravityZ;

  // 根據不同平台調整陀螺儀數據
  if (isIOS.value) {
    // iOS的座標系統需特別處理
    gravityX = Math.sin(gamma) * 9.82;
    gravityZ = Math.sin(beta) * 9.82;
  } else {
    // 其他平台
    gravityX = Math.sin(gamma) * 9.82;
    gravityZ = Math.sin(beta) * 9.82;
  }

  world.gravity.set(gravityX, -9.82, gravityZ);
};

// 處理DeviceMotion事件（提供額外支援）
const handleDeviceMotion = (event: DeviceMotionEvent) => {
  if (!event.accelerationIncludingGravity) return;

  const x = event.accelerationIncludingGravity.x || 0;
  const y = event.accelerationIncludingGravity.y || 0;
  const z = event.accelerationIncludingGravity.z || 0;

  // 確保 world 物件存在且有 gravity 屬性
  if (!world || !world.gravity) return;

  // 根據加速度調整重力方向（需要調整系數以獲得良好的遊戲體驗）
  // iOS和Android的座標系統不同，需要特別處理
  if (isIOS.value) {
    world.gravity.set(-x * 0.9, -9.82, y * 0.9);
  } else {
    world.gravity.set(x * 0.9, -9.82, y * 0.9);
  }
};

// 專門處理陀螺儀啟用的函數
const setupDeviceOrientation = () => {
  window.addEventListener('deviceorientation', handleOrientation, true);

  // 嘗試使用DeviceMotionEvent
  window.addEventListener('devicemotion', handleDeviceMotion, true);
};

// 創建容器（左、右、底部三面牆，完全貼合畫布邊緣）
const createContainer = () => {
  // 移除舊的牆壁視覺效果
  wallMeshes.forEach((mesh) => {
    if (mesh) scene.remove(mesh);
  });
  wallMeshes = [];

  // 移除舊的物理牆壁（如果存在）
  if (frontWallBody) world.removeBody(frontWallBody);
  if (backWallBody) world.removeBody(backWallBody);
  if (leftWallBody) world.removeBody(leftWallBody);
  if (rightWallBody) world.removeBody(rightWallBody);
  if (floorBody) world.removeBody(floorBody);
  if (ceilingBody) world.removeBody(ceilingBody);

  // 創建透明材質 - 微弱的藍色調，帶有高透明度
  const wallMaterial = new THREE.MeshBasicMaterial({
    color: 0x2196f3,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });

  // 底部牆壁
  const floorGeometry = new THREE.PlaneGeometry(containerWidth, containerDepth);
  const floorMesh = new THREE.Mesh(floorGeometry, wallMaterial);
  floorMesh.rotation.x = Math.PI / 2;
  floorMesh.position.set(0, -containerHeight / 2, 0);
  scene.add(floorMesh);
  wallMeshes.push(floorMesh);

  // 左側牆壁
  const leftWallGeometry = new THREE.PlaneGeometry(containerDepth, containerHeight);
  const leftWallMesh = new THREE.Mesh(leftWallGeometry, wallMaterial);
  leftWallMesh.rotation.y = Math.PI / 2;
  leftWallMesh.position.set(-containerWidth / 2, 0, 0);
  scene.add(leftWallMesh);
  wallMeshes.push(leftWallMesh);

  // 右側牆壁
  const rightWallGeometry = new THREE.PlaneGeometry(containerDepth, containerHeight);
  const rightWallMesh = new THREE.Mesh(rightWallGeometry, wallMaterial);
  rightWallMesh.rotation.y = -Math.PI / 2;
  rightWallMesh.position.set(containerWidth / 2, 0, 0);
  scene.add(rightWallMesh);
  wallMeshes.push(rightWallMesh);

  // 前面牆壁
  const frontWallGeometry = new THREE.PlaneGeometry(containerWidth, containerHeight);
  const frontWallMesh = new THREE.Mesh(frontWallGeometry, wallMaterial);
  frontWallMesh.position.set(0, 0, containerDepth / 2);
  scene.add(frontWallMesh);
  wallMeshes.push(frontWallMesh);

  // 後面牆壁
  const backWallGeometry = new THREE.PlaneGeometry(containerWidth, containerHeight);
  const backWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWallMesh.rotation.y = Math.PI;
  backWallMesh.position.set(0, 0, -containerDepth / 2);
  scene.add(backWallMesh);
  wallMeshes.push(backWallMesh);

  // 頂部牆壁（通常不可見，但為完整性添加）
  const ceilingGeometry = new THREE.PlaneGeometry(containerWidth, containerDepth);
  const ceilingMesh = new THREE.Mesh(ceilingGeometry, wallMaterial);
  ceilingMesh.rotation.x = -Math.PI / 2;
  ceilingMesh.position.set(0, containerHeight / 2 + 2, 0);
  scene.add(ceilingMesh);
  wallMeshes.push(ceilingMesh);

  // 添加邊框線以增強視覺效果
  const edgesGeometry = new THREE.BoxGeometry(containerWidth, containerHeight, containerDepth);
  const edges = new THREE.EdgesGeometry(edgesGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
  });
  const edgeLines = new THREE.LineSegments(edges, lineMaterial);
  scene.add(edgeLines);
  wallMeshes.push(edgeLines as unknown as THREE.Mesh);

  // 創建物理牆壁
  // 底部牆壁
  const floorShape = new CANNON.Box(new CANNON.Vec3(containerWidth / 2, 0.2, containerDepth / 2));
  floorBody = new CANNON.Body({ mass: 0 });
  floorBody.addShape(floorShape);
  floorBody.position.set(0, -containerHeight / 2, 0);
  world.addBody(floorBody);

  // 左側牆壁
  const leftWallShape = new CANNON.Box(
    new CANNON.Vec3(0.1, containerHeight / 2, containerDepth / 2),
  );
  leftWallBody = new CANNON.Body({ mass: 0 });
  leftWallBody.addShape(leftWallShape);
  leftWallBody.position.set(-containerWidth / 2, 0, 0);
  world.addBody(leftWallBody);

  // 右側牆壁
  const rightWallShape = new CANNON.Box(
    new CANNON.Vec3(0.1, containerHeight / 2, containerDepth / 2),
  );
  rightWallBody = new CANNON.Body({ mass: 0 });
  rightWallBody.addShape(rightWallShape);
  rightWallBody.position.set(containerWidth / 2, 0, 0);
  world.addBody(rightWallBody);

  // 前面牆壁
  const frontWallShape = new CANNON.Box(
    new CANNON.Vec3(containerWidth / 2, containerHeight / 2, 0.1),
  );
  frontWallBody = new CANNON.Body({ mass: 0 });
  frontWallBody.addShape(frontWallShape);
  frontWallBody.position.set(0, 0, containerDepth / 2);
  world.addBody(frontWallBody);

  // 後面牆壁
  const backWallShape = new CANNON.Box(
    new CANNON.Vec3(containerWidth / 2, containerHeight / 2, 0.1),
  );
  backWallBody = new CANNON.Body({ mass: 0 });
  backWallBody.addShape(backWallShape);
  backWallBody.position.set(0, 0, -containerDepth / 2);
  world.addBody(backWallBody);

  // 頂部障礙
  const ceilingShape = new CANNON.Box(new CANNON.Vec3(containerWidth / 2, 0.2, containerDepth / 2));
  ceilingBody = new CANNON.Body({ mass: 0 });
  ceilingBody.addShape(ceilingShape);
  ceilingBody.position.set(0, containerHeight / 2 + 2, 0);
  world.addBody(ceilingBody);
};

// 創建一個有方格紋路的球體
const createOneBall = () => {
  const sphereGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
  const selectedColor = getRandomColor();

  // 創建方格紋理
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (context) {
    // 設置主色和深色
    const mainColor = selectedColor.main.clone();
    const darkerColor = mainColor.clone().multiplyScalar(0.5);

    // 先填充整個畫布為主色（半透明）
    context.fillStyle = `rgba(${Math.floor(mainColor.r * 255)}, ${Math.floor(
      mainColor.g * 255,
    )}, ${Math.floor(mainColor.b * 255)}, 0.6)`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 選擇只繪製左半邊或上半邊的方格紋路
    const halfStyle = Math.random() > 0.5 ? 'left' : 'top';

    // 繪製方格紋路，只在一半區域
    const gridSize = 64; // 方格大小一致

    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        // 只在半球區域繪製不透明方格
        if (
          (halfStyle === 'left' && x < canvas.width / 2) ||
          (halfStyle === 'top' && y < canvas.height / 2)
        ) {
          // 設置基礎顏色（完全不透明）
          if ((Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 2 === 0) {
            context.fillStyle = darkerColor.getStyle();
          } else {
            context.fillStyle = mainColor.getStyle();
          }
          context.fillRect(x, y, gridSize, gridSize);
        }
      }
    }

    // 繪製分隔兩半的線紋路
    context.lineWidth = 4; // 線條寬度
    context.strokeStyle = '#ffffff'; // 使用白色線條

    if (halfStyle === 'left') {
      // 繪製垂直分隔線
      context.beginPath();
      context.moveTo(canvas.width / 2, 0);
      context.lineTo(canvas.width / 2, canvas.height);
      context.stroke();
    } else {
      // 繪製水平分隔線
      context.beginPath();
      context.moveTo(0, canvas.height / 2);
      context.lineTo(canvas.width, canvas.height / 2);
      context.stroke();
    }
  }

  // 創建紋理
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);

  // 使用紋理創建材質，設定適當的透明度
  const sphereMaterial = new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 70,
    transparent: true,
    opacity: 1.0, // 設置為1.0，紋理自身的透明度會保留
  });

  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  scene.add(sphereMesh);

  // 創建內部的正方形紙物體 (5px厚度)
  const paperSize = ballRadius * 1.2; // 正方形大小，略小於球體半徑
  const paperThickness = 0.15; // 約5px的厚度，在Three.js單位中的換算

  // 創建紙張幾何體
  const paperGeometry = new THREE.BoxGeometry(paperSize, paperSize, paperThickness);

  // 為紙張創建材質
  const paperMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // 白色
    roughness: 0.7, // 稍微粗糙，像紙張
    metalness: 0.0, // 非金屬
  });

  const paperMesh = new THREE.Mesh(paperGeometry, paperMaterial);
  // 將紙張附加到球體內部
  sphereMesh.add(paperMesh);
  // 設置紙張位置，讓它在球體內部但稍微靠前
  paperMesh.position.set(0, 0, 0.5);
  // 隨機旋轉紙張以增加視覺變化
  paperMesh.rotation.set(
    Math.random() * Math.PI * 0.1,
    Math.random() * Math.PI * 0.1,
    Math.random() * Math.PI * 0.1,
  );

  const sphereShape = new CANNON.Sphere(ballRadius);

  // 計算容器內的隨機位置，保留一些邊界空間以避免球體直接碰到牆壁
  const safeMargin = ballRadius * 1.2; // 安全邊距，避免球體直接生成在牆壁上
  const randomX = (Math.random() - 0.5) * (containerWidth - safeMargin * 2);

  const sphereBody = new CANNON.Body({
    mass: 1,
    shape: sphereShape,
    position: new CANNON.Vec3(
      randomX, // 在 x 軸上隨機位置
      containerHeight / 2 - 2, // 在 y 軸上放置位置
      0, // 在 z 軸上位置
    ),
    material: new CANNON.Material({
      friction: 0.5,
      restitution: 0.3, // 降低彈性系數以減少反彈
    }),
  });

  // 降低初始力量以減少碰撞
  sphereBody.applyLocalForce(
    new CANNON.Vec3(
      (Math.random() - 0.5) * 0.5, // 降低初始力量
      (Math.random() - 0.5) * 0.5, // 降低初始力量
      (Math.random() - 0.5) * 0.2, // 降低初始力量
    ),
    new CANNON.Vec3(0, 0, 0),
  );

  // 降低初始的角速度，使球體不會旋轉太快
  sphereBody.angularVelocity.set(
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2,
  );

  // 降低初始線速度
  sphereBody.velocity.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);

  world.addBody(sphereBody);
  balls.push({ id: selectedColor.id, mesh: sphereMesh, body: sphereBody, innerSquare: paperMesh });

  // 減少待添加的球體數量
  ballsToAdd -= 1;
};

// 找到最接近底部中心的球體 - 改進版本
const findClosestBallToBottom = () => {
  if (balls.length === 0) return null;

  const centerX = 0;
  const bottomY = -containerHeight / 2;
  const bottomZ = 0;

  let closestBall = null;
  let minDistance = Infinity;

  balls.forEach((ball, index) => {
    // 忽略正在特殊處理中的球體
    if (ball.isTransferring) return;

    // 計算球體到底部中心的距離
    const dx = ball.body.position.x - centerX;
    const dy = ball.body.position.y - bottomY;
    const dz = ball.body.position.z - bottomZ;

    // 使用三維距離計算
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    // 優先考慮更靠近底部的球體，增加y軸距離的權重
    const weightedDistance = distanceSquared + dy * dy * 2;

    if (weightedDistance < minDistance) {
      minDistance = weightedDistance;
      closestBall = { ball, index };
    }
  });

  return closestBall;
};

// 計算畫布的視角比例並調整相機與容器
const calculateDimensions = () => {
  if (!canvasRef.value) return;

  // 獲取畫布的實際尺寸
  const canvasWidth = canvasRef.value.clientWidth;
  const canvasHeight = canvasRef.value.clientHeight;
  const aspect = canvasWidth / canvasHeight;

  // 設定基本容器高度（保持不變）
  const baseHeight = 15;

  // 調整為正交相機（無透視效果）
  if (camera instanceof THREE.PerspectiveCamera) {
    // 創建新的正交相機替換原有的透視相機
    const newCamera = new THREE.OrthographicCamera(
      -containerWidth / 2,
      containerWidth / 2,
      baseHeight / 2,
      -baseHeight / 2,
      0.1,
      1000,
    );
    newCamera.position.copy(camera.position);
    newCamera.lookAt(camera.getWorldDirection(new THREE.Vector3()));

    // 替換相機
    camera = newCamera;
    scene.remove(camera);
    scene.add(camera);
  }

  // 為正交相機設置合適的視野
  if (camera instanceof THREE.OrthographicCamera) {
    const zoom = 1;
    camera.left = (-containerWidth / 2) * zoom;
    camera.right = (containerWidth / 2) * zoom;
    camera.top = (baseHeight / 2) * zoom;
    camera.bottom = (-baseHeight / 2) * zoom;
    camera.updateProjectionMatrix();
  }

  // 根據畫布比例設置容器尺寸，保持左右比例一致
  containerWidth = baseHeight * aspect;
  containerDepth = 10; // 降低深度，減少透視感

  // 設置相機較近的位置，減少透視感
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
};

// 初始化 Three.js 及 CANNON.js - 上方容器
const initScene = () => {
  if (!canvasRef.value) return;

  // 創建場景
  scene = new THREE.Scene();
  scene.background = null;

  // 獲取畫布的實際尺寸
  const canvasWidth = canvasRef.value.clientWidth;
  const canvasHeight = canvasRef.value.clientHeight;
  const aspect = canvasWidth / canvasHeight;

  // 設置容器的初始尺寸
  containerWidth = 15 * aspect;
  containerDepth = 4; // 減小深度以降低透視感

  // 創建正交相機（無透視效果）
  camera = new THREE.OrthographicCamera(
    -containerWidth / 2,
    containerWidth / 2,
    containerHeight / 2,
    -containerHeight / 2,
    0.1,
    1000,
  );
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  // 創建渲染器並設置為填滿容器
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(canvasWidth, canvasHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding; // 增強色彩表現

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // 提高環境光亮度
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  scene.add(directionalLight);

  // 添加前方的點光源，增強前面的照明
  const frontLight = new THREE.PointLight(0xffffff, 0.8);
  frontLight.position.set(0, 0, 15);
  scene.add(frontLight);

  // 添加側面的點光源，使球體紋理更加明顯
  const leftLight = new THREE.PointLight(0xffffff, 0.6);
  leftLight.position.set(-10, 5, 5);
  scene.add(leftLight);

  const rightLight = new THREE.PointLight(0xffffff, 0.6);
  rightLight.position.set(10, 5, 5);
  scene.add(rightLight);

  // 初始化物理世界，使用較低的重力加速度以減少碰撞強度
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -100, 0),
  });

  // 設定物理世界的額外參數以減少碰撞
  world.defaultContactMaterial.friction = 0.2; // 降低摩擦力
  world.defaultContactMaterial.restitution = 0.7; // 降低彈性系數
  world.defaultContactMaterial.contactEquationStiffness = 1e6; // 接觸剛度
  world.defaultContactMaterial.contactEquationRelaxation = 3; // 接觸鬆弛係數

  // 計算正確尺寸並創建容器
  calculateDimensions();
  createContainer();

  // 初始化計時器，第一顆球延遲投放
  nextBallTimer = 0.2;
};

// 處理窗口大小變化
const handleResize = () => {
  // 處理上方容器的大小變化
  if (camera && renderer && canvasRef.value) {
    // 獲取畫布的實際尺寸
    const canvasWidth = canvasRef.value.clientWidth;
    const canvasHeight = canvasRef.value.clientHeight;
    const aspect = canvasWidth / canvasHeight;

    // 調整渲染器尺寸
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 根據新的畫布比例更新容器寬度
    containerWidth = 15 * aspect;

    // 如果是正交相機，直接更新視場
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left = -containerWidth / 2;
      camera.right = containerWidth / 2;
      camera.top = containerHeight / 2;
      camera.bottom = -containerHeight / 2;
      camera.updateProjectionMatrix();
    }

    // 重新創建容器以反映新尺寸
    createContainer();
  }
};

// 更新渲染循環 - 上方容器
const animate = (time: number) => {
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  // 更新物理模擬 - 使用較小的時間步長以獲得更平滑的模擬
  world.step(1 / 90, delta, 3);

  // 定時投放新球體 - 增加間隔時間以避免同時出現太多球體
  nextBallTimer -= delta;
  if (nextBallTimer <= 0 && ballsToAdd > 0) {
    createOneBall();
    nextBallTimer = 0.8; // 設定間隔時間，每0.8秒投放一個球，減少碰撞機會
  }

  // 更新球體位置 - 上方容器
  balls.forEach((ball) => {
    ball.mesh.position.copy(ball.body.position as any);
    ball.mesh.quaternion.copy(ball.body.quaternion as any);

    // 對於正在特殊處理中的球體，確保它們直線下落
    if (ball.isTransferring) {
      // 重置水平速度，確保只有垂直向下的運動
      ball.body.velocity.x = 0;
      ball.body.velocity.z = 0;

      // 確保垂直向下的速度保持足夠大
      if (ball.body.velocity.y > -10) {
        ball.body.velocity.y = -15;
      }

      // 防止旋轉
      ball.body.angularVelocity.set(0, 0, 0);
    } else {
      // 檢查是否有球體掉出容器範圍，如果有則重置它們的位置
      if (
        ball.body.position.y < -containerHeight ||
        Math.abs(ball.body.position.x) > containerWidth ||
        Math.abs(ball.body.position.z) > containerDepth
      ) {
        // 計算容器內的隨機位置，保留一些邊界空間以避免球體直接碰到牆壁
        const safeMargin = ballRadius * 1.5; // 增加安全邊距
        const randomX = (Math.random() - 0.5) * (containerWidth - safeMargin * 2);
        // 隨機位置在容器頂部，確保球體不會重疊
        const randomY = containerHeight / 2 - safeMargin - Math.random() * 3;
        const randomZ = (Math.random() - 0.5) * (containerDepth - safeMargin * 2);

        // 重置位置到容器內的隨機位置
        ball.body.position.set(randomX, randomY, randomZ);

        // 重置速度和角速度 - 使用較小的初始速度
        ball.body.velocity.set(0, 0, 0);
        ball.body.angularVelocity.set(0, 0, 0);

        // 添加微小的隨機力量 - 進一步降低力量
        ball.body.applyLocalForce(
          new CANNON.Vec3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
          ),
          new CANNON.Vec3(0, 0, 0),
        );
      }

      // 限制球體的最大速度以避免過度碰撞
      const maxVelocity = 15;
      const currentVelocity = ball.body.velocity.length();
      if (currentVelocity > maxVelocity) {
        ball.body.velocity.scale(maxVelocity / currentVelocity, ball.body.velocity);
      }

      // 限制角速度以避免過度旋轉
      const maxAngularVelocity = 10;
      const currentAngularVelocity = ball.body.angularVelocity.length();
      if (currentAngularVelocity > maxAngularVelocity) {
        ball.body.angularVelocity.scale(
          maxAngularVelocity / currentAngularVelocity,
          ball.body.angularVelocity,
        );
      }
    }
  });

  // 渲染場景 - 上方容器
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }

  // 請求下一幀
  requestAnimationFrame(animate);
};

// 設置控制選項（鍵盤和備用控制）
const setupControls = () => {
  // 使用虛擬操控按鈕來提供備用控制
  const setupVirtualControls = () => {
    // 使用鍵盤方向鍵作為備用控制
    window.addEventListener('keydown', (event) => {
      let gravityX = world.gravity.x;
      let gravityZ = world.gravity.z;

      switch (event.key) {
        case 'ArrowUp':
          gravityZ = -9.82;
          gravityX = 0;
          break;
        case 'ArrowDown':
          gravityZ = 9.82;
          gravityX = 0;
          break;
        case 'ArrowLeft':
          gravityX = -9.82;
          gravityZ = 0;
          break;
        case 'ArrowRight':
          gravityX = 9.82;
          gravityZ = 0;
          break;
        case 'r':
          // 重置重力
          gravityX = 0;
          gravityZ = 0;
          break;
        case ' ':
          // 空白鍵添加新球
          if (ballsToAdd > 0) {
            createOneBall();
          }
          break;
        default:
          // 處理其他按鍵或不做任何事
          break;
      }

      world.gravity.set(gravityX, -9.82, gravityZ);
    });
  };

  // 設置虛擬控制作為備用方案
  setupVirtualControls();

  // 檢測是否為iOS設備
  isIOS.value = detectIOS();

  // 如果不是iOS，可以直接設置陀螺儀
  if (!isIOS.value) {
    setupDeviceOrientation();
  }
  // 否則必須等待用戶點擊授權按鈕
};

// 暴露方法給父組件
defineExpose({
  findClosestBallToBottom,
});

// 元件掛載時初始化
onMounted(() => {
  // 延遲一小段時間後初始化場景，確保DOM已經完全渲染
  setTimeout(() => {
    initScene();
    setupControls();
    // 初始調用一次handleResize以確保尺寸正確
    handleResize();
    requestAnimationFrame(animate);

    // 如果已經有陀螺儀權限，直接啟用陀螺儀監聽
    if (hasPermission.value) {
      enableGyroscope(handleOrientation, handleDeviceMotion);
    }
  }, 100);

  window.addEventListener('resize', handleResize);
});

// 元件銷毀前清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('deviceorientation', handleOrientation);
  window.removeEventListener('deviceorientationabsolute', handleOrientation);
  window.removeEventListener('devicemotion', handleDeviceMotion);

  // 釋放上方容器資源
  if (renderer) {
    renderer.dispose();
  }

  // 清除上方容器場景物件
  if (scene) {
    scene.clear();
  }

  // 清除上方容器物理世界
  if (world) {
    balls.forEach(({ body }) => {
      world.removeBody(body);
    });
  }
});
</script>

<style scoped>
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(0.5px);
  -webkit-backdrop-filter: blur(0.5px);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  z-index: 2;
  overflow: hidden;
}
canvas {
  display: block;
}
.permission-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.8);
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
