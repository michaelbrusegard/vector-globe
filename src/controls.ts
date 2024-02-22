import {
  Quaternion,
  Spherical,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import { cartesianToSpherical } from './geometry';
import { type Pointer } from './pointer';
import { type Outline } from './outline';

class Controls {
  private camera: PerspectiveCamera;
  private domElement: HTMLCanvasElement;
  private pointer: Pointer;
  public enabled: boolean;
  private target: Vector3;
  private cursor: Vector3;
  public minTargetRadius: number;
  public maxTargetRadius: number;
  public minPolarAngle: number;
  public maxPolarAngle: number;
  public minAzimuthAngle: number;
  public maxAzimuthAngle: number;
  public enableDamping: boolean;
  public dampingFactor: number;
  public enableRotate: boolean;
  public scrollRotate: boolean;
  public rotateSpeed: number;
  public autoRotate: boolean;
  public autoRotateSpeed: number;
  public autoRotateDelay: number;
  public keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };
  private target0: Vector3;
  private position0: Vector3;
  private _domElementKeyEvents: HTMLElement | null;
  public getPolarAngle: () => number;
  public getAzimuthalAngle: () => number;
  public getDistance: () => number;
  public listenToKeyEvents: (domElement: HTMLElement) => void;
  public stopListenToKeyEvents: () => void;
  public saveState: () => void;
  public reset: () => void;
  public update: (deltaTime?: number) => boolean;
  public dispose: () => void;
  public rotateTo: (
    targetPoint: Vector2,
    duration: number,
    callback: () => void,
    ease: (t: number) => number,
    disableRotate: boolean,
  ) => void;
  constructor(
    camera: PerspectiveCamera,
    domElement: HTMLCanvasElement,
    pointer: Pointer,
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.pointer = pointer;
    this.domElement.style.touchAction = 'none';
    this.enabled = true;
    this.target = new Vector3();
    this.cursor = new Vector3();
    this.minTargetRadius = 0;
    this.maxTargetRadius = Infinity;
    this.minPolarAngle = Math.PI / 2 - Math.PI / 5;
    this.maxPolarAngle = Math.PI / 2 + Math.PI / 5;
    this.minAzimuthAngle = -Infinity;
    this.maxAzimuthAngle = Infinity;
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    this.enableRotate = true;
    this.scrollRotate = true;
    this.rotateSpeed = 1.0;
    this.autoRotate = true;
    this.autoRotateSpeed = -0.0000694444 * 4800;
    this.autoRotateDelay = 2500;
    this.keys = {
      LEFT: 'ArrowLeft',
      UP: 'ArrowUp',
      RIGHT: 'ArrowRight',
      BOTTOM: 'ArrowDown',
    };
    this.target0 = this.target.clone();
    this.position0 = this.camera.position.clone();
    this._domElementKeyEvents = null;

    this.getPolarAngle = function () {
      return spherical.phi;
    };

    this.getAzimuthalAngle = function () {
      return spherical.theta;
    };

    this.getDistance = function () {
      return this.camera.position.distanceTo(this.target);
    };

    this.listenToKeyEvents = function (domElement) {
      domElement.addEventListener('keydown', onKeyDown);
      this._domElementKeyEvents = domElement;
    };

    this.stopListenToKeyEvents = function () {
      this._domElementKeyEvents?.removeEventListener('keydown', onKeyDown);
      this._domElementKeyEvents = null;
    };

    this.saveState = function () {
      scope.target0.copy(scope.target);
      scope.position0.copy(scope.camera.position);
    };

    this.reset = function () {
      scope.target.copy(scope.target0);
      scope.camera.position.copy(scope.position0);

      scope.camera.updateProjectionMatrix();

      scope.update();

      state = STATE.NONE;
    };

    this.update = (function () {
      const offset = new Vector3();

      const quat = new Quaternion().setFromUnitVectors(
        camera.up,
        new Vector3(0, 1, 0),
      );

      const quatInverse = quat.clone().invert();

      const lastPosition = new Vector3();
      const lastQuaternion = new Quaternion();
      const lastTargetPosition = new Vector3();

      const twoPI = 2 * Math.PI;

      return function update(deltaTime?: number) {
        const position = scope.camera.position;

        offset.copy(position).sub(scope.target);

        offset.applyQuaternion(quat);

        spherical.setFromVector3(offset);

        if (scope.autoRotate && state === STATE.NONE) {
          rotateLeft(getAutoRotationAngle(deltaTime));
        }

        if (scope.enableDamping) {
          spherical.theta += sphericalDelta.theta * scope.dampingFactor;
          spherical.phi += sphericalDelta.phi * scope.dampingFactor;
        } else {
          spherical.theta += sphericalDelta.theta;
          spherical.phi += sphericalDelta.phi;
        }

        let min = scope.minAzimuthAngle;
        let max = scope.maxAzimuthAngle;

        if (isFinite(min) && isFinite(max)) {
          if (min < -Math.PI) min += twoPI;
          else if (min > Math.PI) min -= twoPI;

          if (max < -Math.PI) max += twoPI;
          else if (max > Math.PI) max -= twoPI;

          if (min <= max) {
            spherical.theta = Math.max(min, Math.min(max, spherical.theta));
          } else {
            spherical.theta =
              spherical.theta > (min + max) / 2
                ? Math.max(min, spherical.theta)
                : Math.min(max, spherical.theta);
          }
        }

        spherical.phi = Math.max(
          scope.minPolarAngle,
          Math.min(scope.maxPolarAngle, spherical.phi),
        );

        spherical.makeSafe();

        scope.target.sub(scope.cursor);
        scope.target.clampLength(scope.minTargetRadius, scope.maxTargetRadius);
        scope.target.add(scope.cursor);

        offset.setFromSpherical(spherical);
        offset.applyQuaternion(quatInverse);

        position.copy(scope.target).add(offset);

        scope.camera.lookAt(scope.target);

        if (scope.enableDamping === true) {
          sphericalDelta.theta *= 1 - scope.dampingFactor;
          sphericalDelta.phi *= 1 - scope.dampingFactor;
        } else {
          sphericalDelta.set(0, 0, 0);
        }

        if (
          lastPosition.distanceToSquared(scope.camera.position) > EPS ||
          8 * (1 - lastQuaternion.dot(scope.camera.quaternion)) > EPS ||
          lastTargetPosition.distanceToSquared(scope.target) > 0
        ) {
          lastPosition.copy(scope.camera.position);
          lastQuaternion.copy(scope.camera.quaternion);
          lastTargetPosition.copy(scope.target);

          return true;
        }

        return false;
      };
    })();

    this.dispose = function () {
      scope.domElement.removeEventListener('contextmenu', onContextMenu);

      scope.domElement.removeEventListener('pointerdown', onPointerDown);
      scope.domElement.removeEventListener('pointercancel', onPointerUp);
      scope.domElement.removeEventListener('wheel', onMouseWheel);

      scope.domElement.removeEventListener('pointermove', onPointerMove);
      scope.domElement.removeEventListener('pointerup', onPointerUp);

      if (scope._domElementKeyEvents !== null) {
        scope._domElementKeyEvents.removeEventListener('keydown', onKeyDown);
        scope._domElementKeyEvents = null;
      }
    };

    this.rotateTo = function (
      targetPoint: Vector2,
      duration: number,
      callback: () => void,
      ease: (t: number) => number,
      disableRotate: boolean,
    ) {
      const rotateEnabled = scope.enableRotate;
      if (disableRotate && rotateEnabled) scope.enableRotate = false;

      const MS_PER_SECOND = 1000;
      const FRAMES_PER_SECOND = 60;
      const frames = (duration / MS_PER_SECOND) * FRAMES_PER_SECOND;
      let currentFrame = 0;

      targetPoint.x = targetPoint.x * (Math.PI / 180);
      targetPoint.y = targetPoint.y * (Math.PI / 180);

      const cameraPosition = scope.camera.position.clone();
      const cameraPoint = cartesianToSpherical(cameraPosition);

      cameraPoint.x = cameraPoint.x * (Math.PI / 180);
      cameraPoint.y = cameraPoint.y * (Math.PI / 180);

      const totalRotationLeft = -(targetPoint.x - cameraPoint.x);
      const totalRotationUp = targetPoint.y - cameraPoint.y;

      const animateRotate = () => {
        const progress = ease(currentFrame / frames);
        const lastProgress = Math.max(ease((currentFrame - 1) / frames), 0);
        rotateLeft(
          totalRotationLeft * progress - totalRotationLeft * lastProgress,
        );
        rotateUp(totalRotationUp * progress - totalRotationUp * lastProgress);
        currentFrame++;

        if (currentFrame <= frames) {
          requestAnimationFrame(animateRotate);
        } else {
          autoRotateRestart();
          if (disableRotate && rotateEnabled) scope.enableRotate = true;
          callback();
        }
      };

      requestAnimationFrame(animateRotate);
    };

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const scope = this;

    const STATE = {
      NONE: -1,
      ROTATE: 0,
      TOUCH_ROTATE: 1,
      SCROLL_ROTATE: 2,
    };

    let state = STATE.NONE;

    const EPS = 0.000001;

    const spherical = new Spherical();
    const sphericalDelta = new Spherical();
    const rotateStart = new Vector2();
    const rotateEnd = new Vector2();
    const rotateDelta = new Vector2();

    const pointers: PointerEvent['pointerId'][] = [];
    const pointerPositions: Record<number, Vector2> = {};
    let mouseWheelTimeout: number | null = null;
    let keyDownTimeout: number | null = null;

    function getAutoRotationAngle(deltaTime?: number) {
      if (deltaTime) {
        return ((2 * Math.PI) / 60) * scope.autoRotateSpeed * deltaTime;
      } else {
        return ((2 * Math.PI) / 60 / 60) * scope.autoRotateSpeed;
      }
    }

    function autoRotateRestart() {
      if (scope.autoRotate === false) return;
      scope.autoRotate = false;
      setTimeout(() => {
        scope.autoRotate = true;
      }, scope.autoRotateDelay);
    }

    function rotateLeft(angle: number) {
      sphericalDelta.theta -= angle;
    }

    function rotateUp(angle: number) {
      sphericalDelta.phi -= angle;
    }

    function handleMouseDownRotate(event: MouseEvent) {
      rotateStart.set(event.clientX, event.clientY);
    }

    function handleMouseMoveRotate(event: MouseEvent) {
      rotateEnd.set(event.clientX, event.clientY);

      rotateDelta
        .subVectors(rotateEnd, rotateStart)
        .multiplyScalar(scope.rotateSpeed);

      const element = scope.domElement;

      rotateLeft((2 * Math.PI * rotateDelta.x) / element.clientHeight);

      rotateUp((2 * Math.PI * rotateDelta.y) / element.clientHeight);

      rotateStart.copy(rotateEnd);

      scope.update();
    }

    function handleMouseWheel(event: WheelEvent) {
      const verticalScrollAmount = -event.deltaY * scope.rotateSpeed;
      const horizontalScrollAmount = -event.deltaX * scope.rotateSpeed;

      const verticalRotationAngle =
        (2 * Math.PI * verticalScrollAmount) / scope.domElement.clientHeight;
      const horizontalRotationAngle =
        (2 * Math.PI * horizontalScrollAmount) / scope.domElement.clientHeight;

      rotateUp(verticalRotationAngle);
      rotateLeft(horizontalRotationAngle);

      event.preventDefault();
      scope.update();

      if (mouseWheelTimeout !== null) {
        clearTimeout(mouseWheelTimeout);
      }

      mouseWheelTimeout = setTimeout(() => {
        autoRotateRestart();
        state = STATE.NONE;
      }, 200);
    }

    function handleKeyDown(event: KeyboardEvent) {
      let needsUpdate = false;

      switch (event.code) {
        case scope.keys.UP:
          rotateUp(
            (4 * Math.PI * scope.rotateSpeed) / scope.domElement.clientHeight,
          );

          needsUpdate = true;
          break;

        case scope.keys.BOTTOM:
          rotateUp(
            (-4 * Math.PI * scope.rotateSpeed) / scope.domElement.clientHeight,
          );

          needsUpdate = true;
          break;

        case scope.keys.LEFT:
          rotateLeft(
            (4 * Math.PI * scope.rotateSpeed) / scope.domElement.clientHeight,
          );

          needsUpdate = true;
          break;

        case scope.keys.RIGHT:
          rotateLeft(
            (-4 * Math.PI * scope.rotateSpeed) / scope.domElement.clientHeight,
          );
          needsUpdate = true;
          break;
      }

      if (needsUpdate) {
        event.preventDefault();
        scope.update();

        if (keyDownTimeout !== null) {
          clearTimeout(keyDownTimeout);
        }

        keyDownTimeout = setTimeout(() => {
          autoRotateRestart();
          state = STATE.NONE;
        }, 200);
      }
    }

    function handleTouchStartRotate(event: PointerEvent) {
      if (pointers.length === 1) {
        rotateStart.set(event.pageX, event.pageY);
      } else {
        const position = getSecondPointerPosition(event);

        const x = 0.5 * (event.pageX + position.x);
        const y = 0.5 * (event.pageY + position.y);

        rotateStart.set(x, y);
      }
    }

    function handleTouchMoveRotate(event: PointerEvent) {
      if (pointers.length == 1) {
        rotateEnd.set(event.pageX, event.pageY);
      } else {
        const position = getSecondPointerPosition(event);

        const x = 0.5 * (event.pageX + position.x);
        const y = 0.5 * (event.pageY + position.y);

        rotateEnd.set(x, y);
      }

      rotateDelta
        .subVectors(rotateEnd, rotateStart)
        .multiplyScalar(scope.rotateSpeed);

      const element = scope.domElement;

      rotateLeft((2 * Math.PI * rotateDelta.x) / element.clientHeight);

      rotateUp((2 * Math.PI * rotateDelta.y) / element.clientHeight);

      rotateStart.copy(rotateEnd);
    }

    function onPointerDown(event: PointerEvent) {
      if (scope.enabled === false) return;

      if (pointers.length === 0) {
        scope.domElement.setPointerCapture(event.pointerId);

        scope.domElement.addEventListener('pointermove', onPointerMove);
        scope.domElement.addEventListener('pointerup', onPointerUp);
      }

      addPointer(event);

      if (event.pointerType === 'touch') {
        onTouchStart(event);
      } else {
        onMouseDown(event);
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (scope.enabled === false) return;

      if (event.pointerType === 'touch') {
        onTouchMove(event);
      } else {
        onMouseMove(event);
      }
    }

    function onPointerUp(event: PointerEvent) {
      removePointer(event);

      if (scope.pointer.getMeshIntersection()) {
        autoRotateRestart();
      }

      switch (pointers.length) {
        case 0:
          scope.domElement.releasePointerCapture(event.pointerId);

          scope.domElement.removeEventListener('pointermove', onPointerMove);
          scope.domElement.removeEventListener('pointerup', onPointerUp);

          state = STATE.NONE;

          break;

        case 1:
          const pointerId = pointers[0];
          const position = pointerPositions[pointerId!];

          if (position) {
            const newEvent = new PointerEvent('pointerdown', {
              pointerId: pointerId,
              clientX: position.x,
              clientY: position.y,
            });

            onTouchStart(newEvent);
          }

          break;
      }
    }

    function onMouseDown(event: MouseEvent) {
      if (scope.enableRotate === false || !scope.pointer.getMeshIntersection())
        return;
      handleMouseDownRotate(event);
      state = STATE.ROTATE;
    }

    function onMouseMove(event: MouseEvent) {
      if (state === STATE.ROTATE) {
        if (
          scope.enableRotate === false ||
          !scope.pointer.getMeshIntersection()
        )
          return;
        handleMouseMoveRotate(event);
      }
    }

    function onMouseWheel(event: WheelEvent) {
      if (
        scope.enableRotate === false ||
        scope.scrollRotate === false ||
        !scope.pointer.getMeshIntersection()
      )
        return;
      handleMouseWheel(event);
      state = STATE.SCROLL_ROTATE;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (scope.enabled === false) return;
      handleKeyDown(event);
    }

    function onTouchStart(event: PointerEvent) {
      trackPointer(event);
      if (scope.enableRotate === false || !scope.pointer.getMeshIntersection())
        return;
      handleTouchStartRotate(event);
      state = STATE.TOUCH_ROTATE;
    }

    function onTouchMove(event: PointerEvent) {
      trackPointer(event);
      if (state === STATE.TOUCH_ROTATE)
        if (
          scope.enableRotate === false ||
          !scope.pointer.getMeshIntersection()
        )
          return;
      handleTouchMoveRotate(event);
      scope.update();
    }

    function onContextMenu(event: MouseEvent) {
      if (scope.enabled === false || !scope.pointer.getMeshIntersection())
        return;
      event.preventDefault();
      state = STATE.NONE;
    }

    function addPointer(event: PointerEvent) {
      pointers.push(event.pointerId);
    }

    function removePointer(event: PointerEvent) {
      delete pointerPositions[event.pointerId];

      for (let i = 0; i < pointers.length; i++) {
        if (pointers[i] == event.pointerId) {
          pointers.splice(i, 1);
          return;
        }
      }
    }

    function trackPointer(event: PointerEvent) {
      let position = pointerPositions[event.pointerId];

      if (position === undefined) {
        position = new Vector2();
        pointerPositions[event.pointerId] = position;
      }

      position.set(event.pageX, event.pageY);
    }

    function getSecondPointerPosition(event: PointerEvent) {
      const pointerId =
        event.pointerId === pointers[0] ? pointers[1] : pointers[0];

      return pointerPositions[pointerId!] ?? new Vector2();
    }

    scope.domElement.addEventListener('contextmenu', onContextMenu);
    scope.domElement.addEventListener('pointerdown', onPointerDown);
    scope.domElement.addEventListener('pointercancel', onPointerUp);
    scope.domElement.addEventListener('wheel', onMouseWheel);

    this.update();
  }

  public zoom(
    targetZoom: number | undefined,
    duration: number,
    callback: () => void,
    ease: (t: number) => number,
    outline: Outline,
  ) {
    if (targetZoom === undefined) {
      targetZoom = this.camera.zoom === 1 ? 0.75 : 1;
    }
    const startZoom = this.camera.zoom;
    const MS_PER_SECOND = 1000;
    const FRAMES_PER_SECOND = 60;
    const frames = (duration / MS_PER_SECOND) * FRAMES_PER_SECOND;
    let currentFrame = 0;

    const animateZoom = () => {
      if (currentFrame <= frames) {
        const progress = ease(currentFrame / frames);
        this.camera.zoom = startZoom + progress * (targetZoom! - startZoom);
        this.camera.updateProjectionMatrix();
        currentFrame++;
        requestAnimationFrame(animateZoom);
      } else {
        this.camera.zoom = targetZoom!;
        this.camera.updateProjectionMatrix();
        callback();
      }
      outline.calculateSize(this.camera.zoom);
    };

    requestAnimationFrame(animateZoom);
  }
}

export { Controls };
