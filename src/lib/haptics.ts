/** Subtle haptic feedback for cart/wishlist actions on supported devices. */
export function triggerHaptic(type: "light" | "medium" | "success" = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const patterns: Record<typeof type, number | number[]> = {
    light: 10,
    medium: 20,
    success: [10, 30, 10],
  };
  try {
    navigator.vibrate(patterns[type]);
  } catch {
    /* ignore */
  }
}
