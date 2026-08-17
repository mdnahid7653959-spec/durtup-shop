import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./client";

/**
 * Uploads a file to Firebase Storage and returns its public download URL.
 * @param bucket The folder/bucket name (e.g., 'product-media', 'avatars', 'seller-support')
 * @param path The relative file path inside the bucket
 * @param file The File or Blob object to upload
 */
export async function uploadFileToFirebase(
  bucket: string,
  path: string,
  file: File | Blob
): Promise<string> {
  const fullPath = `${bucket}/${path}`;
  const storageRef = ref(storage, fullPath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * Gets the public/download URL for a file in Firebase Storage.
 * @param bucket The folder/bucket name
 * @param path The relative file path inside the bucket
 */
export async function getFirebaseFileUrl(
  bucket: string,
  path: string
): Promise<string> {
  const fullPath = `${bucket}/${path}`;
  const storageRef = ref(storage, fullPath);
  return await getDownloadURL(storageRef);
}
