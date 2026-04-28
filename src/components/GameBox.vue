<template>
  <canvas
    ref="boxRef"
    class="absolute top-[33.5%] left-1/2 -translate-x-1/2 !w-[46%] !h-[48.5%]"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

type Ball = {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  innerSquare?: THREE.Mesh;
};

// 畫布參考
const boxRef = ref<HTMLCanvasElement | null>(null);

// 下方盒子的場景和物理引擎設置
let boxScene: THREE.Scene;
let boxCamera: THREE.PerspectiveCamera;
let boxRenderer: THREE.WebGLRenderer;
let boxWorld: CANNON.World;
let transferredBall: Ball | null = null; // 儲存從上方掉落的球體

// 下方盒子的球體集合
const boxBalls: Ball[] = [];

// boxRef 的物理牆壁參考
let boxFrontWallBody: CANNON.Body | null = null;
let boxBackWallBody: CANNON.Body | null = null;
let boxLeftWallBody: CANNON.Body | null = null;
let boxRightWallBody: CANNON.Body | null = null;
let boxFloorBody: CANNON.Body | null = null;
let boxCeilingBody: CANNON.Body | null = null;

// 視覺牆壁參考
let boxWallMeshes: THREE.Mesh[] = [];

// 下方盒子的容器尺寸
let boxContainerWidth = 8;
const boxContainerHeight = 15;
let boxContainerDepth = 8;

// 球體大小
const ballRadius = 2;

// 為下方盒子創建容器
const createBoxContainer = () => {
  // 移除舊的牆壁視覺效果
  boxWallMeshes.forEach((mesh) => {
    if (mesh) boxScene.remove(mesh);
  });
  boxWallMeshes = [];

  // 移除舊的物理牆壁（如果存在）
  if (boxFrontWallBody) boxWorld.removeBody(boxFrontWallBody);
  if (boxBackWallBody) boxWorld.removeBody(boxBackWallBody);
  if (boxLeftWallBody) boxWorld.removeBody(boxLeftWallBody);
  if (boxRightWallBody) boxWorld.removeBody(boxRightWallBody);
  if (boxFloorBody) boxWorld.removeBody(boxFloorBody);
  if (boxCeilingBody) boxWorld.removeBody(boxCeilingBody);

  // 創建牆壁材質 - 側牆和後牆使用 #868686 顏色，前牆透明
  const sideWallMaterial = new THREE.MeshStandardMaterial({
    color: 0x868686,
    roughness: 0.7,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const frontWallMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });

  // 底部牆壁 - 使用側牆顏色
  const floorGeometry = new THREE.PlaneGeometry(boxContainerWidth, boxContainerDepth);
  const floorMesh = new THREE.Mesh(floorGeometry, sideWallMaterial);
  floorMesh.rotation.x = Math.PI / 2;
  floorMesh.position.set(0, -boxContainerHeight / 2, 0);
  floorMesh.receiveShadow = true; // 接收陰影
  boxScene.add(floorMesh);
  boxWallMeshes.push(floorMesh);

  // 左側牆壁 - #868686 顏色
  const leftWallGeometry = new THREE.PlaneGeometry(boxContainerDepth, boxContainerHeight);
  const leftWallMesh = new THREE.Mesh(leftWallGeometry, sideWallMaterial);
  leftWallMesh.rotation.y = Math.PI / 2;
  leftWallMesh.position.set(-boxContainerWidth / 2, 0, 0);
  leftWallMesh.receiveShadow = true; // 接收陰影
  boxScene.add(leftWallMesh);
  boxWallMeshes.push(leftWallMesh);

  // 右側牆壁 - #868686 顏色
  const rightWallGeometry = new THREE.PlaneGeometry(boxContainerDepth, boxContainerHeight);
  const rightWallMesh = new THREE.Mesh(rightWallGeometry, sideWallMaterial);
  rightWallMesh.rotation.y = -Math.PI / 2;
  rightWallMesh.position.set(boxContainerWidth / 2, 0, 0);
  rightWallMesh.receiveShadow = true; // 接收陰影
  boxScene.add(rightWallMesh);
  boxWallMeshes.push(rightWallMesh);

  // 前面牆壁 - 透明
  const frontWallGeometry = new THREE.PlaneGeometry(boxContainerWidth, boxContainerHeight);
  const frontWallMesh = new THREE.Mesh(frontWallGeometry, frontWallMaterial);
  frontWallMesh.position.set(0, 0, boxContainerDepth / 2);
  boxScene.add(frontWallMesh);
  boxWallMeshes.push(frontWallMesh);

  // 後面牆壁 - #868686 顏色，使用 MeshStandardMaterial 以更好地反射光線
  const backWallGeometry = new THREE.PlaneGeometry(boxContainerWidth, boxContainerHeight);
  const backWallMaterial = new THREE.MeshStandardMaterial({
    color: 0x868686,
    roughness: 0.7, // 調整粗糙度
    metalness: 0.2, // 添加輕微金屬感
    side: THREE.DoubleSide,
  });
  const backWallMesh = new THREE.Mesh(backWallGeometry, backWallMaterial);
  backWallMesh.rotation.y = Math.PI;
  backWallMesh.position.set(0, 0, -boxContainerDepth / 2);
  backWallMesh.receiveShadow = true; // 讓後牆接收陰影
  boxScene.add(backWallMesh);
  boxWallMeshes.push(backWallMesh);

  // 頂部牆壁 - 使用側牆顏色
  const ceilingGeometry = new THREE.PlaneGeometry(boxContainerWidth, boxContainerDepth);
  const ceilingMesh = new THREE.Mesh(ceilingGeometry, sideWallMaterial);
  ceilingMesh.rotation.x = -Math.PI / 2;
  ceilingMesh.position.set(0, boxContainerHeight / 2, 0);
  ceilingMesh.receiveShadow = true; // 接收陰影
  boxScene.add(ceilingMesh);
  boxWallMeshes.push(ceilingMesh);

  // 創建物理牆壁
  // 底部牆壁
  const floorShape = new CANNON.Box(
    new CANNON.Vec3(boxContainerWidth / 2, 0.2, boxContainerDepth / 2),
  );
  boxFloorBody = new CANNON.Body({ mass: 0 });
  boxFloorBody.addShape(floorShape);
  boxFloorBody.position.set(0, -boxContainerHeight / 2, 0);
  boxWorld.addBody(boxFloorBody);

  // 左側牆壁
  const leftWallShape = new CANNON.Box(
    new CANNON.Vec3(0.1, boxContainerHeight / 2, boxContainerDepth / 2),
  );
  boxLeftWallBody = new CANNON.Body({ mass: 0 });
  boxLeftWallBody.addShape(leftWallShape);
  boxLeftWallBody.position.set(-boxContainerWidth / 2, 0, 0);
  boxWorld.addBody(boxLeftWallBody);

  // 右側牆壁
  const rightWallShape = new CANNON.Box(
    new CANNON.Vec3(0.1, boxContainerHeight / 2, boxContainerDepth / 2),
  );
  boxRightWallBody = new CANNON.Body({ mass: 0 });
  boxRightWallBody.addShape(rightWallShape);
  boxRightWallBody.position.set(boxContainerWidth / 2, 0, 0);
  boxWorld.addBody(boxRightWallBody);

  // 前面牆壁
  const frontWallShape = new CANNON.Box(
    new CANNON.Vec3(boxContainerWidth / 2, boxContainerHeight / 2, 0.1),
  );
  boxFrontWallBody = new CANNON.Body({ mass: 0 });
  boxFrontWallBody.addShape(frontWallShape);
  boxFrontWallBody.position.set(0, 0, boxContainerDepth / 2);
  boxWorld.addBody(boxFrontWallBody);

  // 後面牆壁
  const backWallShape = new CANNON.Box(
    new CANNON.Vec3(boxContainerWidth / 2, boxContainerHeight / 2, 0.1),
  );
  boxBackWallBody = new CANNON.Body({ mass: 0 });
  boxBackWallBody.addShape(backWallShape);
  boxBackWallBody.position.set(0, 0, -boxContainerDepth / 2);
  boxWorld.addBody(boxBackWallBody);

  // 頂部障礙 (天花板)
  const ceilingShape = new CANNON.Box(
    new CANNON.Vec3(boxContainerWidth / 2, 0.2, boxContainerDepth / 2),
  );
  boxCeilingBody = new CANNON.Body({ mass: 0 });
  boxCeilingBody.addShape(ceilingShape);
  boxCeilingBody.position.set(0, boxContainerHeight / 2, 0);
  boxWorld.addBody(boxCeilingBody);
};

// 複製球體到下方盒子
const copyBallToBoxContainer = (ball: any) => {
  // 複製球體幾何體及材質
  const sphereGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
  const sphereMaterial = ball.mesh.material.clone();
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.castShadow = true; // 讓球體投射陰影
  sphereMesh.receiveShadow = true; // 讓球體接收陰影
  boxScene.add(sphereMesh);

  // 複製內部紙張
  let innerSquareMesh = null;
  if (ball.innerSquare) {
    const paperGeometry = new THREE.BoxGeometry(
      ball.innerSquare.geometry.parameters.width,
      ball.innerSquare.geometry.parameters.height,
      ball.innerSquare.geometry.parameters.depth,
    );
    const paperMaterial = ball.innerSquare.material.clone();
    innerSquareMesh = new THREE.Mesh(paperGeometry, paperMaterial);
    sphereMesh.add(innerSquareMesh);
    innerSquareMesh.position.copy(ball.innerSquare.position);
    innerSquareMesh.rotation.copy(ball.innerSquare.rotation);
  }

  // 創建新的物理球體
  const sphereShape = new CANNON.Sphere(ballRadius);
  const sphereBody = new CANNON.Body({
    mass: 1,
    shape: sphereShape,
    position: new CANNON.Vec3(
      0, // x軸居中
      boxContainerHeight / 2 - 2, // 從上方出現
      0, // z軸居中
    ),
    material: new CANNON.Material({
      friction: 0.5,
      restitution: 0.3,
    }),
  });

  // 設置初始速度為垂直向下
  sphereBody.velocity.set(0, -5, 0); // 向下的速度，稍微降低速度使動畫更自然

  boxWorld.addBody(sphereBody);
  boxBalls.push({ mesh: sphereMesh, body: sphereBody, innerSquare: innerSquareMesh });

  return { mesh: sphereMesh, body: sphereBody, innerSquare: innerSquareMesh };
};

// 計算下方盒子的尺寸並設置透視相機
const calculateBoxDimensions = () => {
  if (!boxRef.value) return;

  // 獲取畫布的實際尺寸
  const boxWidth = boxRef.value.clientWidth;
  const boxHeight = boxRef.value.clientHeight;
  const aspect = boxWidth / boxHeight;

  // 設定基本容器高度（保持不變）
  const baseHeight = 15;

  // 設置透視相機參數
  const fov = 60; // 視野角度
  const near = 0.1; // 近裁剪面
  const far = 1000; // 遠裁剪面

  // 創建透視相機（帶透視效果）
  boxCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  boxCamera.position.set(0, 0, 12); // 設置相機位置，稍微遠一點以顯示透視效果
  boxCamera.lookAt(0, 0, 0);

  // 根據畫布比例設置容器尺寸
  boxContainerWidth = baseHeight * aspect;
  boxContainerDepth = 12; // 增加深度，增強透視感

  // 更新相機投影矩陣
  boxCamera.updateProjectionMatrix();
};

// 初始化下方盒子的 Three.js 及 CANNON.js
const initBoxScene = () => {
  if (!boxRef.value) return;

  // 創建場景
  boxScene = new THREE.Scene();
  boxScene.background = new THREE.Color(0x868686); // 設置背景色為 #868686

  // 獲取畫布的實際尺寸
  const boxWidth = boxRef.value.clientWidth;
  const boxHeight = boxRef.value.clientHeight;
  const aspect = boxWidth / boxHeight;

  // 設置容器的初始尺寸
  boxContainerWidth = 15 * aspect;
  boxContainerDepth = 12; // 增加深度以增強透視感

  // 創建透視相機（帶透視效果）
  const fov = 60; // 視野角度
  const near = 0.1; // 近裁剪面
  const far = 1000; // 遠裁剪面
  boxCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  boxCamera.position.set(0, 0, 12);
  boxCamera.lookAt(0, 0, 0);

  // 創建渲染器並設置為填滿容器
  boxRenderer = new THREE.WebGLRenderer({
    canvas: boxRef.value,
    antialias: true,
    alpha: true,
  });
  boxRenderer.setSize(boxWidth, boxHeight);
  boxRenderer.setPixelRatio(window.devicePixelRatio);
  boxRenderer.shadowMap.enabled = true;
  boxRenderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用柔和陰影
  boxRenderer.outputEncoding = THREE.sRGBEncoding;

  // 添加光源 - 優化從前方打光照向後方牆壁

  // 降低環境光強度以突顯主要光源效果
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  boxScene.add(ambientLight);

  // 調整方向光以提供整體照明
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  boxScene.add(directionalLight);

  // 增強前方點光源，使用聚光燈以實現從前方打光照向後牆的效果
  const frontLight = new THREE.SpotLight(0xffffff, 1.2);
  frontLight.position.set(0, 0, boxContainerDepth + 5); // 放在前方更遠的位置
  frontLight.target.position.set(0, 0, -boxContainerDepth / 2); // 指向後牆
  frontLight.castShadow = true; // 開啟陰影投射
  frontLight.shadow.mapSize.width = 1024;
  frontLight.shadow.mapSize.height = 1024;
  frontLight.angle = Math.PI / 6; // 調整光束角度
  frontLight.penumbra = 0.2; // 光束邊緣柔和度
  frontLight.decay = 1.5; // 光源衰減
  boxScene.add(frontLight);
  boxScene.add(frontLight.target); // 必須將光源目標添加到場景中

  // 減弱側面光源的強度
  const leftLight = new THREE.PointLight(0xffffff, 0.4);
  leftLight.position.set(-10, 5, 5);
  boxScene.add(leftLight);

  const rightLight = new THREE.PointLight(0xffffff, 0.4);
  rightLight.position.set(10, 5, 5);
  boxScene.add(rightLight);

  // 初始化物理世界
  boxWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -7.5, 0),
  });

  // 設定物理世界參數
  boxWorld.defaultContactMaterial.friction = 0.3;
  boxWorld.defaultContactMaterial.restitution = 0.2;
  boxWorld.defaultContactMaterial.contactEquationStiffness = 1e6;
  boxWorld.defaultContactMaterial.contactEquationRelaxation = 3;

  // 計算正確尺寸並創建容器
  calculateBoxDimensions();
  createBoxContainer();
};

// 處理窗口大小變化
const handleResize = () => {
  // 處理下方盒子的大小變化
  if (boxCamera && boxRenderer && boxRef.value) {
    // 獲取畫布的實際尺寸
    const boxWidth = boxRef.value.clientWidth;
    const boxHeight = boxRef.value.clientHeight;
    const aspect = boxWidth / boxHeight;

    // 調整渲染器尺寸
    boxRenderer.setSize(boxWidth, boxHeight);
    boxRenderer.setPixelRatio(window.devicePixelRatio);

    // 根據新的畫布比例更新容器寬度
    boxContainerWidth = 15 * aspect;

    // 更新透視相機的長寬比
    if (boxCamera instanceof THREE.PerspectiveCamera) {
      boxCamera.aspect = aspect;
      boxCamera.updateProjectionMatrix();
    }

    // 重新創建下方盒子容器以反映新尺寸
    createBoxContainer();
  }
};

// 更新渲染循環 - 下方盒子
const animate = (time: number) => {
  // 更新物理模擬
  if (boxWorld) {
    boxWorld.step(1 / 90, 1 / 60, 3);
  }

  // 更新下方盒子中的球體位置
  boxBalls.forEach((ball) => {
    ball.mesh.position.copy(ball.body.position as any);
    ball.mesh.quaternion.copy(ball.body.quaternion as any);

    // 限制球體的最大速度
    const maxVelocity = 15;
    const currentVelocity = ball.body.velocity.length();
    if (currentVelocity > maxVelocity) {
      ball.body.velocity.scale(maxVelocity / currentVelocity, ball.body.velocity);
    }

    // 限制角速度
    const maxAngularVelocity = 10;
    const currentAngularVelocity = ball.body.angularVelocity.length();
    if (currentAngularVelocity > maxAngularVelocity) {
      ball.body.angularVelocity.scale(
        maxAngularVelocity / currentAngularVelocity,
        ball.body.angularVelocity,
      );
    }
  });

  // 渲染下方盒子場景
  if (boxRenderer && boxScene && boxCamera) {
    boxRenderer.render(boxScene, boxCamera);
  }

  // 請求下一幀
  requestAnimationFrame(animate);
};

// 處理陀螺儀事件
const handleOrientation = (event: DeviceOrientationEvent) => {
  if (event.beta === null || event.gamma === null || !boxWorld) return;

  // 根據陀螺儀數據調整重力方向
  const beta = (event.beta * Math.PI) / 180; // x軸旋轉 (前後傾斜)
  const gamma = (event.gamma * Math.PI) / 180; // y軸旋轉 (左右傾斜)

  const gravityX = Math.sin(gamma) * 9.82;
  const gravityZ = Math.sin(beta) * 9.82;

  boxWorld.gravity.set(gravityX, -9.82, gravityZ);
};

// 接收從上方容器掉落的球體
const receiveBall = (ball: any) => {
  transferredBall = copyBallToBoxContainer(ball);
};

// 暴露方法給父組件
defineExpose({
  receiveBall,
});

// 元件掛載時初始化
onMounted(() => {
  // 延遲一小段時間後初始化場景，確保DOM已經完全渲染
  setTimeout(() => {
    initBoxScene();
    // 初始調用一次handleResize以確保尺寸正確
    handleResize();
    requestAnimationFrame(animate);
  }, 100);

  window.addEventListener('resize', handleResize);
  window.addEventListener('deviceorientation', handleOrientation);
});

// 元件銷毀前清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('deviceorientation', handleOrientation);

  // 釋放下方盒子資源
  if (boxRenderer) {
    boxRenderer.dispose();
  }

  // 清除下方盒子場景物件
  if (boxScene) {
    boxScene.clear();
  }

  // 清除下方盒子物理世界
  if (boxWorld) {
    boxBalls.forEach(({ body }) => {
      boxWorld.removeBody(body);
    });
  }
});
</script>

<style scoped>
canvas {
  display: block;
}
</style>
