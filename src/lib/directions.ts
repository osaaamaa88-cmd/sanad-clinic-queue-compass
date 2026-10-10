export function directionsPath(lat: number | string, lng: number | string, name = "") {
  return `/directions?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`;
}
