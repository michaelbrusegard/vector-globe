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
  public mesh: Mesh;
  public globeMaterial: MeshBasicMaterial;
  public axisMaterial: LineBasicMaterial;
  public vectorMaterial: LineBasicMaterial;
  public vectorHover: boolean;
  public vectorHoverMaterial: LineBasicMaterial;
  public vectorHoverScale: number;
  public vectorHoverAnimationDuration: number;
  public vectorHoverease: (t: number) => number;
  private _earthTilt: boolean;
  private axis: Group;
  private vectors: Group;
  private lineVectors: LineVector[];
  public intersectingVector: LineVector | null;
  constructor(
    geojson: FeatureCollection | undefined,
    countries: boolean,
    detailLevel: 'low' | 'medium' | 'high',
  ) {
    super();
    this.mesh = new Mesh();
    this.axis = new Group();
    this.vectors = new Group();
    this.lineVectors = [];
    this.globeMaterial = new MeshBasicMaterial({
      color: 0x080808,
      transparent: true,
      opacity: 0.9,
    });
    this.axisMaterial = new LineBasicMaterial({
      color: 0x444444,
    });
    this.vectorMaterial = new LineBasicMaterial({
      color: 0x666666,
    });
    this.vectorHover = true;
    this.vectorHoverMaterial = new LineBasicMaterial({
      color: 0xeeeeee,
    });
    this.vectorHoverScale = 1.02;
    this.vectorHoverAnimationDuration = 200;
    this.vectorHoverease = (t: number) => t;
    this._earthTilt = false;
    this.earthTilt = this._earthTilt;
    this.intersectingVector = null;

    this.createMesh();
    this.createAxis();
    this.add(this.mesh);
    this.add(this.axis);

    if (geojson) {
      this.createVectors(geojson);
      this.add(this.vectors);
    } else {
      getGeojson(detailLevel, countries)
        .then((geojson) => {
          this.createVectors(geojson);
          this.add(this.vectors);
        })
        .catch((error) => {
          console.error('Error loading geojson:', error);
        });
    }
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
      this.axis.add(line);
    }

    for (let lat = -80; lat <= 80; lat += 10) {
      const radius = Math.cos((lat * Math.PI) / 180);
      const geometry = new RingGeometry(radius, radius, 48);
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, Math.sin((lat * Math.PI) / 180), 0);
      const line = new LineLoop(geometry, material);
      this.axis.add(line);
    }

    this.axis.renderOrder = 1;
  }

  private createVectors(geojson: FeatureCollection) {
    for (const feature of geojson.features) {
      const lineVector = new LineVector(feature, this.vectorMaterial);
      lineVector.lines.renderOrder = 2;
      this.lineVectors.push(lineVector);
      this.vectors.add(lineVector.lines);
    }
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
