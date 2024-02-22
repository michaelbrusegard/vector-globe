import { Raycaster, Vector2, type PerspectiveCamera, type Mesh } from 'three';

class Pointer {
  public mouse: Vector2;
  private camera: PerspectiveCamera;
  private domElement: HTMLCanvasElement;
  private mesh: Mesh;
  private raycaster: Raycaster;

  constructor(
    camera: PerspectiveCamera,
    domElement: HTMLCanvasElement,
    mesh: Mesh,
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.mesh = mesh;
    this.mouse = new Vector2(Infinity, Infinity);
    this.raycaster = new Raycaster();

    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onMouseMove(event: MouseEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public getMeshIntersection() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObject(this.mesh)[0];
  }

  public dispose() {
    this.domElement.removeEventListener(
      'mousemove',
      this.onMouseMove.bind(this),
    );
  }
}

export { Pointer };
