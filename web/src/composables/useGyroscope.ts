import { ref, readonly } from 'vue';
import * as Sentry from '@sentry/vue';

// 陀螺儀狀態管理
const isGyroscopeEnabled = ref(false);
const isIOS = ref(false);
const hasPermission = ref(false);

// 檢測是否為 iOS 裝置
const detectIOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

// 檢測是否需要權限
const needsPermission = () => {
  return (
    (typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function') ||
    (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function')
  );
};

// 請求陀螺儀權限
const requestGyroscopePermission = async (): Promise<boolean> => {
  try {
    // 檢測設備類型
    isIOS.value = detectIOS();

    // 如果需要權限（主要是 iOS 13+）
    if (needsPermission()) {
      let permissionGranted = false;

      // 嘗試請求 DeviceMotionEvent 權限
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        const motionPermission = await (DeviceMotionEvent as any).requestPermission();
        if (motionPermission === 'granted') {
          permissionGranted = true;
        }
      }

      // 嘗試請求 DeviceOrientationEvent 權限
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();
        if (orientationPermission === 'granted') {
          permissionGranted = true;
        }
      }

      if (!permissionGranted) {
        Sentry.captureException('陀螺儀權限被拒絕');
        return false;
      }
    }

    // 設置權限狀態
    hasPermission.value = true;
    isGyroscopeEnabled.value = true;
    return true;
  } catch (e) {
    Sentry.captureException(`請求陀螺儀權限時出錯:${e}`);
    return false;
  }
};

// 啟用陀螺儀監聽
const enableGyroscope = (
  onOrientation?: (event: DeviceOrientationEvent) => void,
  onMotion?: (event: DeviceMotionEvent) => void,
) => {
  if (!hasPermission.value) {
    Sentry.captureException('陀螺儀權限未獲取，無法啟用');
    return false;
  }

  try {
    // 添加 deviceorientation 事件監聽
    if (onOrientation) {
      window.addEventListener('deviceorientation', onOrientation, true);
    }

    // 添加 devicemotion 事件監聽
    if (onMotion) {
      window.addEventListener('devicemotion', onMotion, true);
    }

    // 嘗試添加 deviceorientationabsolute 事件（某些設備支援）
    if ((window as any).DeviceOrientationAbsoluteEvent && onOrientation) {
      window.addEventListener('deviceorientationabsolute', onOrientation, true);
    }

    isGyroscopeEnabled.value = true;
    return true;
  } catch (e) {
    Sentry.captureException(`啟用陀螺儀監聽時出錯:${e}`);
    return false;
  }
};

// 禁用陀螺儀監聽
const disableGyroscope = (
  onOrientation?: (event: DeviceOrientationEvent) => void,
  onMotion?: (event: DeviceMotionEvent) => void,
) => {
  try {
    if (onOrientation) {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('deviceorientationabsolute', onOrientation);
    }

    if (onMotion) {
      window.removeEventListener('devicemotion', onMotion);
    }

    isGyroscopeEnabled.value = false;
  } catch (e) {
    Sentry.captureException(`禁用陀螺儀監聽時出錯:${e}`);
  }
};

export function useGyroscope() {
  return {
    isGyroscopeEnabled: readonly(isGyroscopeEnabled),
    isIOS: readonly(isIOS),
    hasPermission: readonly(hasPermission),
    requestGyroscopePermission,
    enableGyroscope,
    disableGyroscope,
    needsPermission,
  };
}
