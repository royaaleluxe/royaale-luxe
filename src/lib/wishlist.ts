import { updateUserProfile } from "./firestore";

export async function toggleWishlistItem(
  userId: string,
  current: string[],
  productId: string
): Promise<string[]> {
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  await updateUserProfile(userId, { savedWishlist: next });
  return next;
}
