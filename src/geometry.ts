import {
  Vector2,
  Vector3,
  BufferGeometry,
  Line,
  Group,
  Box2,
  type LineBasicMaterial,
} from 'three';
import type { Feature } from './geojson';

abstract class Geometry {
  public abstract type: string;
  public coordinates: number[][][] | number[][][][];
  protected boundingBox: Box2;
  constructor(data: Feature) {
    this.coordinates = data.geometry.coordinates;
    this.boundingBox = this.computeBoundingBox();
  }

  protected abstract computeBoundingBox(): Box2;

  public pointInBoundingBox(point: Vector2): boolean {
    return this.boundingBox.containsPoint(point);
  }

  public abstract linesFromCoordinates(material: LineBasicMaterial): Group;

  public abstract pointInGeometry(point: Vector2): boolean;

  protected pointInRing(point: Vector2, ring: number[][]) {
    function isLeft(p0: number[], p1: number[], p2: Vector2) {
      return (
        (p1[0]! - p0[0]!) * (p2.y - p0[1]!) -
        (p2.x - p0[0]!) * (p1[1]! - p0[1]!)
      );
    }
    let windingNumber = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      if (ring[i]![1]! <= point.y) {
        if (ring[i + 1]![1]! > point.y) {
          if (isLeft(ring[i]!, ring[i + 1]!, point) > 0) {
            windingNumber++;
          }
        }
      } else {
        if (ring[i + 1]![1]! <= point.y) {
          if (isLeft(ring[i]!, ring[i + 1]!, point) < 0) {
            windingNumber--;
          }
        }
      }
    }
    return windingNumber !== 0;
  }
}

class Polygon extends Geometry {
  public type = 'Polygon';
  declare coordinates: number[][][];
  constructor(data: Feature) {
    super(data);
  }

  protected computeBoundingBox() {
    const min = new Vector2(Infinity, Infinity);
    const max = new Vector2(-Infinity, -Infinity);
    for (const ring of this.coordinates) {
      for (const coordinates of ring) {
        min.x = Math.min(min.x, coordinates[0]!);
        min.y = Math.min(min.y, coordinates[1]!);
        max.x = Math.max(max.x, coordinates[0]!);
        max.y = Math.max(max.y, coordinates[1]!);
      }
    }
    return new Box2(min, max);
  }

  public linesFromCoordinates(material: LineBasicMaterial) {
    const lines = new Group();
    for (const ring of this.coordinates) {
      const vertices = [];
      for (const coordinates of ring) {
        vertices.push(
          sphericalToCartesian(new Vector2(coordinates[0], coordinates[1])),
        );
      }
      const geometry = new BufferGeometry().setFromPoints(vertices);
      lines.add(new Line(geometry, material));
    }
    return lines;
  }

  public pointInGeometry(point: Vector2) {
    for (const ring of this.coordinates) {
      if (this.pointInRing(point, ring)) {
        return true;
      }
    }
    return false;
  }
}

class MultiPolygon extends Geometry {
  public type = 'MultiPolygon';
  declare coordinates: number[][][][];
  constructor(data: Feature) {
    super(data);
  }

  protected computeBoundingBox() {
    const min = new Vector2(Infinity, Infinity);
    const max = new Vector2(-Infinity, -Infinity);
    for (const polygon of this.coordinates) {
      for (const ring of polygon) {
        for (const coordinates of ring) {
          min.x = Math.min(min.x, coordinates[0]!);
          min.y = Math.min(min.y, coordinates[1]!);
          max.x = Math.max(max.x, coordinates[0]!);
          max.y = Math.max(max.y, coordinates[1]!);
        }
      }
    }
    return new Box2(min, max);
  }

  public linesFromCoordinates(material: LineBasicMaterial) {
    const lines = new Group();
    for (const polygon of this.coordinates) {
      for (const ring of polygon) {
        const vertices = [];
        for (const coordinates of ring) {
          vertices.push(
            sphericalToCartesian(new Vector2(coordinates[0], coordinates[1])),
          );
        }
        const geometry = new BufferGeometry().setFromPoints(vertices);
        lines.add(new Line(geometry, material));
      }
    }
    return lines;
  }

  public pointInGeometry(point: Vector2) {
    for (const polygon of this.coordinates) {
      for (const ring of polygon) {
        if (this.pointInRing(point, ring)) {
          return true;
        }
      }
    }
    return false;
  }
}

function sphericalToCartesian(vector2: Vector2) {
  const lambda = ((vector2.x - 90) * Math.PI) / 180;
  const phi = (vector2.y * Math.PI) / 180;
  return new Vector3(
    Math.cos(phi) * Math.cos(lambda),
    Math.sin(phi),
    -Math.cos(phi) * Math.sin(lambda),
  );
}

function cartesianToSpherical(vector3: Vector3) {
  vector3 = vector3.normalize();
  const longitude = (Math.atan2(vector3.x, vector3.z) * 180) / Math.PI;
  const latitude = (Math.asin(vector3.y) * 180) / Math.PI;
  return new Vector2(longitude, latitude);
}

export {
  Geometry,
  Polygon,
  MultiPolygon,
  sphericalToCartesian,
  cartesianToSpherical,
};
