import {
  type Vector2,
  Color,
  Group,
  Mesh,
  SphereGeometry,
  RingGeometry,
  LineLoop,
  LineBasicMaterial,
  MeshBasicMaterial,
} from 'three';
import { LineVector } from './vector';
import type { Pointer } from './pointer';
import { cartesianToSpherical } from './geometry';
import { type FeatureCollection, getGeojson } from './geojson';

class Globe extends Group {
  public mesh = new Mesh();
  public globeMaterial = new MeshBasicMaterial({
    color: 0x080808,
    transparent: true,
    opacity: 0.9,
  });
  public axisMaterial = new LineBasicMaterial({
    color: 0x444444,
  });
  public vectorMaterial = new LineBasicMaterial({
    color: 0x666666,
  });
  public vectorHover = true;
  public vectorHoverMaterial = new LineBasicMaterial({
    color: 0xeeeeee,
  });
  public vectorHoverScale = 1.02;
  public vectorHoverAnimationDuration = 200;
  public vectorHoverease = (t: number) => t;
  public geojson: FeatureCollection | undefined;
  public countries = true;
  public detailLevel: 'low' | 'medium' | 'high' = 'medium';
  public axis = true;
  public vectors = true;
  private _earthTilt = false;
  private axisGroup = new Group();
  private vectorGroup = new Group();
  private lineVectors: LineVector[] = [];
  public intersectingVector: LineVector | null = null;
  constructor() {
    super();
    this.earthTilt = this._earthTilt;
    this.createMesh();
    this.createAxis();
    this.createVectors();
    this.add(this.mesh);
    if (this.axis) this.add(this.axisGroup);
    if (this.vectors) this.add(this.vectorGroup);
  }

  get earthTilt() {
    return this._earthTilt;
  }

  set earthTilt(value: boolean) {
    this._earthTilt = value;
    this.rotation.z = this._earthTilt ? -23.4 * (Math.PI / 180) : 0;
  }

  private createMesh() {
    this.mesh.geometry = new SphereGeometry(1, 48, 24);
    this.mesh.scale.setScalar(0.9999);
    this.mesh.material = this.globeMaterial;
    this.mesh.renderOrder = 0;
  }

  private createAxis() {
    const material = this.axisMaterial;

    for (let lon = -180; lon <= 180; lon += 10) {
      const geometry = new RingGeometry(1, 1, 48);
      geometry.rotateY((lon * Math.PI) / 180);
      const line = new LineLoop(geometry, material);
      this.axisGroup.add(line);
    }

    for (let lat = -80; lat <= 80; lat += 10) {
      const radius = Math.cos((lat * Math.PI) / 180);
      const geometry = new RingGeometry(radius, radius, 48);
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, Math.sin((lat * Math.PI) / 180), 0);
      const line = new LineLoop(geometry, material);
      this.axisGroup.add(line);
    }
    this.axisGroup.renderOrder = 1;
  }

  private getVectorData(callback: (geojson: FeatureCollection) => void) {
    if (this.geojson) {
      callback(this.geojson);
    } else {
      getGeojson(this.detailLevel, this.countries)
        .then((geojson) => {
          callback(geojson);
        })
        .catch((error) => {
          console.error('Error loading geojson:', error);
        });
    }
  }

  private createVectors() {
    this.getVectorData((geojson) => {
      if (!geojson) {
        return;
      }
      for (const feature of geojson.features) {
        const lineVector = new LineVector(feature, this.vectorMaterial);
        lineVector.lines.renderOrder = 2;
        this.lineVectors.push(lineVector);
        this.vectorGroup.add(lineVector.lines);
      }
    });
  }

  private getIntersectingLineVector(point: Vector2) {
    const lineVectorHits = [];
    for (const vector of this.lineVectors) {
      if (vector.geometry.pointInBoundingBox(point)) {
        lineVectorHits.push(vector);
      }
    }
    for (let i = lineVectorHits.length - 1; i >= 0; i--) {
      if (lineVectorHits[i]!.geometry.pointInGeometry(point)) {
        return lineVectorHits[i]!;
      }
    }
    return null;
  }

  private toggleIntersectingLineVector(pointer: Pointer) {
    const intersection = pointer.getMeshIntersection();
    if (intersection) {
      const point = cartesianToSpherical(intersection.point);
      this.intersectingVector = this.getIntersectingLineVector(point);
    } else {
      this.intersectingVector = null;
    }
  }

  private animateVectorHover() {
    for (const vector of this.lineVectors) {
      if (vector === this.intersectingVector) {
        vector.lines.renderOrder = 3;
        this.vectorHoverAnimation(vector, true);
      } else {
        vector.lines.renderOrder = 2;
        this.vectorHoverAnimation(vector, false);
      }
    }
  }

  private vectorHoverAnimation(vector: LineVector, hover: boolean) {
    const targetScale = hover ? this.vectorHoverScale : 1;
    const targetColor = hover
      ? this.vectorHoverMaterial.color
      : this.vectorMaterial.color;
    const targetOpacity = hover
      ? this.vectorHoverMaterial.opacity
      : this.vectorMaterial.opacity;

    const MS_PER_SECOND = 1000;
    const FRAMES_PER_SECOND = 60;
    const frames =
      (this.vectorHoverAnimationDuration / MS_PER_SECOND) * FRAMES_PER_SECOND;

    const scaleIncrement = (targetScale - vector.lines.scale.x) / frames;
    const opacityIncrement = (targetOpacity - vector.material.opacity) / frames;
    const colorIncrement = new Color(
      (targetColor.r - vector.material.color.r) / frames,
      (targetColor.g - vector.material.color.g) / frames,
      (targetColor.b - vector.material.color.b) / frames,
    );

    const scale = vector.lines.scale.x + scaleIncrement;
    const opacity = vector.material.opacity + opacityIncrement;
    const color = new Color().copy(vector.material.color).add(colorIncrement);

    vector.lines.scale.setScalar(scale);
    vector.material.opacity = opacity;
    vector.material.color.copy(color);
  }

  public update(pointer: Pointer) {
    if (this.vectorHover) {
      this.toggleIntersectingLineVector(pointer);
      this.animateVectorHover();
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
  }
}

export { Globe };
