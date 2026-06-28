import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const MAX_RECEIPT_BYTES = 800_000;

function fileToDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${Math.round(maxBytes / 1024)}KB without Firebase Storage.`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

async function uploadToFirebase(path: string, file: File): Promise<string> {
  if (!storage) throw new Error("Firebase Storage not available");
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export const isFirebaseStorageEnabled = Boolean(storage);

export async function uploadFile(path: string, file: File): Promise<string> {
  return uploadToFirebase(path, file);
}

export async function uploadReceipt(orderId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `receipts/${orderId}_${Date.now()}.${ext}`;

  if (storage) {
    try {
      return await uploadToFirebase(path, file);
    } catch {
      // Blaze plan not enabled or rules blocked — store in Firestore instead
    }
  }

  return fileToDataUrl(file, MAX_RECEIPT_BYTES);
}

export async function uploadProductImage(
  productId: string,
  file: File,
  index: number
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `products/${productId}/${index}_${Date.now()}.${ext}`;

  if (storage) {
    try {
      return await uploadToFirebase(path, file);
    } catch {
      // fall through for small images only
    }
  }

  return fileToDataUrl(file, MAX_RECEIPT_BYTES);
}

export async function uploadHeroImage(slideIndex: number, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `hero/slide_${slideIndex}_${Date.now()}.${ext}`;

  if (storage) {
    try {
      return await uploadToFirebase(path, file);
    } catch {
      // fall through for small images only
    }
  }

  return fileToDataUrl(file, MAX_RECEIPT_BYTES);
}

export function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}
