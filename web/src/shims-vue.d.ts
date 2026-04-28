/* eslint-disable */

/// <reference types="vite/client" />

// Mocks all files ending in `.vue` showing them as plain Vue instances
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Declaration for Three.js module
declare module 'three' {
  export class Scene {
    add(object: any): void;
  }
  
  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
    aspect: number;
    updateProjectionMatrix(): void;
    lookAt(x: number, y: number, z: number): void;
  }
  
  export class WebGLRenderer {
    constructor(options: any);
    setSize(width: number, height: number): void;
    setClearColor(color: number, alpha: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }
  
  export class Group {
    add(object: any): void;
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    children: any[];
  }
  
  export class Mesh {
    constructor(geometry: any, material: any);
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }
  
  export class SphereGeometry {
    constructor(radius: number, widthSegments: number, heightSegments: number, phiStart?: number, phiLength?: number, thetaStart?: number, thetaLength?: number);
  }
  
  export class MeshPhongMaterial {
    constructor(options: any);
  }
  
  export class Shape {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
  }
  
  export class ExtrudeGeometry {
    constructor(shape: Shape, options: any);
  }
  
  export class BoxGeometry {
    constructor(width: number, height: number, depth: number);
  }
  
  export class CylinderGeometry {
    constructor(radiusTop: number, radiusBottom: number, height: number);
  }
  
  export class AmbientLight {
    constructor(color: number, intensity: number);
  }
  
  export class DirectionalLight {
    constructor(color: number, intensity: number);
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
  }
  
  export const Math: any;
  export const PI: number;
}
