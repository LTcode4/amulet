import * as THREE from 'three';

export interface ColorConfig {
  id: number;
  main: THREE.Color;
  color: number;
  name?: string;
}

export const colors: ColorConfig[] = [
  { id: 1, main: new THREE.Color(0x8ec743), color: 0x8ec743, name: '健康御守' }, // 綠色
  { id: 2, main: new THREE.Color(0xffd700), color: 0xffd700, name: '財富御守' }, // 黃色
  { id: 3, main: new THREE.Color(0x64a8dc), color: 0x64a8dc, name: '順利御守' }, // 藍色
  { id: 4, main: new THREE.Color(0xec0000), color: 0xec0000, name: '好運御守' }, // 紅色
  { id: 5, main: new THREE.Color(0x652d1a), color: 0x652d1a, name: '平安御守' }, // 褐色
];

// 取得隨機顏色配置
export const getRandomColor = (): ColorConfig => {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
};
