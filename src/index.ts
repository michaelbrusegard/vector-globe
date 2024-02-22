import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Vector2,
} from 'three';
import { Controls } from './controls';
import { Globe } from './globe';
import { Pointer } from './pointer';
import { Outline } from './outline';
import { Points } from './points';
import type { FeatureCollection } from './geojson';

class VectorGlobe {
  private container: HTMLElement;
  private outline: Outline;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private controls: Controls;
  private globe: Globe;
  private pointer: Pointer;
  private points: Points;

  constructor({
    container = document.body,
    geojson,
    detailLevel = 'medium',
    countries = true,
  }: {
    container?: HTMLElement;
    geojson?: FeatureCollection;
    detailLevel?: 'low' | 'medium' | 'high';
    countries?: boolean;
  }) {
    this.container = container;
    this.container.style.outline = 'none';
    this.container.style.position = 'relative';
    this.container.style.display = 'flex';
    this.container.style.justifyContent = 'center';
    this.container.style.alignItems = 'center';

    this.outline = new Outline(this.container);

    this.scene = new Scene();

    this.globe = new Globe(geojson, countries, detailLevel);
    this.scene.add(this.globe);

    this.camera = new PerspectiveCamera();
    this.camera.position.z = 5;

    this.renderer = new WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;

    this.points = new Points(this.camera, this.renderer.domElement);

    this.pointer = new Pointer(
      this.camera,
      this.renderer.domElement,
      this.globe.mesh,
    );

    this.controls = new Controls(
      this.camera,
      this.renderer.domElement,
      this.pointer,
    );
    this.controls.listenToKeyEvents(this.container);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));

    this.container.appendChild(this.renderer.domElement);
    this.onWindowResize();
    this.animate();
  }

  private onMouseDown(event: MouseEvent) {
    event.preventDefault();
    if (!this.pointer.getMeshIntersection()) {
      this.container.blur();
    }
  }

  private onWindowResize() {
    const scaleFactor = 1.05;
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    const distance = this.camera.position.distanceTo(this.globe.position);
    const minDimension = Math.min(
      this.container.clientHeight,
      this.container.clientWidth,
    );
    const scaledObjectSize = this.container.clientHeight * scaleFactor;
    this.camera.fov =
      2 *
      Math.atan(scaledObjectSize / minDimension / distance) *
      (180 / Math.PI);
    this.camera.updateProjectionMatrix();

    this.outline.calculateSize(this.camera.zoom);

    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.globe.update(this.pointer);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.points.update();
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.container.removeEventListener(
      'mousedown',
      this.onMouseDown.bind(this),
    );

    this.outline.dispose();
    this.pointer.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.points.dispose();
  }

  public rotateTo({
    targetPoint,
    duration = 1000,
    callback = () => {
      return;
    },
    ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    disableRotate = true,
  }: {
    targetPoint: [number, number];
    duration?: number;
    callback?: () => void;
    ease?: (t: number) => number;
    disableRotate?: boolean;
  }) {
    this.controls.rotateTo(
      new Vector2(targetPoint[0], targetPoint[1]),
      duration,
      callback,
      ease,
      disableRotate,
    );
  }

  public zoom({
    targetZoom,
    duration = 500,
    callback = () => {
      return;
    },
    ease = (t: number) => t,
  }: {
    targetZoom?: number;
    duration?: number;
    callback?: () => void;
    ease?: (t: number) => number;
  } = {}) {
    this.controls.zoom(targetZoom, duration, callback, ease, this.outline);
  }

  public getHoveredVectorId() {
    return this.globe.intersectingVector?.id;
  }

  public addPoint({
    element,
    coordinates,
  }: {
    element: HTMLElement;
    coordinates: [number, number];
  }) {
    element.style.position = 'absolute';
    element.style.transform = 'translate(-50%, -50%)';
    this.points.add(element, new Vector2(coordinates[0], coordinates[1]));
    this.container.appendChild(element);
  }

  public removePoint({
    elementOrCoordinates,
  }: {
    elementOrCoordinates: HTMLElement | [number, number];
  }) {
    if (Array.isArray(elementOrCoordinates)) {
      const [x, y] = elementOrCoordinates;
      const vector = new Vector2(x, y);
      this.points.remove(vector);
    } else {
      this.points.remove(elementOrCoordinates);
    }
  }

  public updatePointPosition({
    element,
    coordinates,
  }: {
    element: HTMLElement;
    coordinates: [number, number];
  }) {
    this.points.updatePosition(
      element,
      new Vector2(coordinates[0], coordinates[1]),
    );
  }

  public clearPoints() {
    this.points.clear();
  }
}
export { VectorGlobe as default, type FeatureCollection };
