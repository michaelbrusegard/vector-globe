import { type Group, type LineBasicMaterial } from 'three';
import { Polygon, MultiPolygon } from './geometry';
import type { Feature } from './geojson';

class LineVector {
  public geometry: Polygon | MultiPolygon;
  public lines: Group;
  public material: LineBasicMaterial;
  public id: string;
  public frame: number;
  constructor(data: Feature, material: LineBasicMaterial) {
    this.geometry =
      data.geometry.type === 'Polygon'
        ? new Polygon(data)
        : new MultiPolygon(data);
    this.material = material.clone();
    this.lines = this.geometry.linesFromCoordinates(this.material);
    this.id = data.properties.ID;
    this.frame = 0;
  }
}

export { LineVector };
