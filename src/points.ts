import { type PerspectiveCamera, Vector2, Vector3 } from 'three';
import { sphericalToCartesian } from './geometry';
class Points {
  private camera: PerspectiveCamera;
  private domElement: HTMLCanvasElement;
  private worldDirection: Vector3;
  public objects: {
    element: HTMLElement;
    position: Vector2;
  }[];
  constructor(camera: PerspectiveCamera, domElement: HTMLCanvasElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.objects = [];
    this.worldDirection = new Vector3();
  }

  private cartesianToScreen(vector3: Vector3) {
    const projectedVector = vector3.project(this.camera);
    return new Vector2(
      ((projectedVector.x + 1) * this.domElement.clientWidth) / 2,
      ((-projectedVector.y + 1) * this.domElement.clientHeight) / 2,
    );
  }

  public update() {
    for (const point of this.objects) {
      const cartesianPosition = sphericalToCartesian(point.position);
      const screenPosition = this.cartesianToScreen(cartesianPosition);
      const worldDirection = this.camera.getWorldDirection(this.worldDirection);

      point.element.style.left = `${screenPosition.x}px`;
      point.element.style.top = `${screenPosition.y}px`;

      const isBehindGlobe = worldDirection.dot(cartesianPosition) > 0;
      point.element.dataset.behindGlobe = isBehindGlobe ? 'true' : 'false';
    }
  }

  public add(element: HTMLElement, position: Vector2) {
    this.objects.push({ element, position });
  }

  public remove(elementOrPosition: HTMLElement | Vector2) {
    this.objects = this.objects.filter((object) => {
      if (elementOrPosition instanceof HTMLElement) {
        return object.element !== elementOrPosition;
      } else {
        return !object.position.equals(elementOrPosition);
      }
    });
  }

  public updatePosition(element: HTMLElement, position: Vector2) {
    for (const point of this.objects) {
      if (point.element === element) {
        point.position = position;
        break;
      }
    }
  }

  public clear() {
    this.objects = [];
  }

  public dispose(container: HTMLElement) {
    this.clear();
    for (const point of this.objects) {
      container.removeChild(point.element);
    }
  }
}

export { Points };
