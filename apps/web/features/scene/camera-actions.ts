export function resetCameraView() {
  (window as Window & { __resetGeometryView?: () => void }).__resetGeometryView?.();
}
