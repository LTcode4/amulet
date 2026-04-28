declare module 'src/types' {
  export interface GameHeaderInstance {
    findClosestBallToBottom: () => {
      ball: {
        id: number;
        body: {
          velocity: { set: (x: number, y: number, z: number) => void };
          angularVelocity: { set: (x: number, y: number, z: number) => void };
          collisionFilterGroup: number;
          collisionFilterMask: number;
          position: { y: number };
        };
        isTransferring?: boolean;
      };
      index: number;
    } | null;
  }

  export interface GameBoxInstance {
    receiveBall: (ball: any) => void;
  }
}
