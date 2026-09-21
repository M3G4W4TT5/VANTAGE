import { Cartesian3, Ellipsoid, IntersectionTests, Ray } from 'cesium';

// Check the line segment, not an infinite ray: elevated points beyond the horizon can still be visible.
export function pointVisible(camera: Cartesian3, position: Cartesian3, ellipsoid: Ellipsoid): boolean {
  const direction = Cartesian3.subtract(position, camera, new Cartesian3());
  const distance = Cartesian3.magnitude(direction);
  if (distance === 0) return true;
  Cartesian3.divideByScalar(direction, distance, direction);
  const hit = IntersectionTests.rayEllipsoid(new Ray(camera, direction), ellipsoid);
  return !hit || hit.start >= distance - 0.1;
}
