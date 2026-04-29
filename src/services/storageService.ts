import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'

export async function uploadThumbnail(designId: string, dataUrl: string): Promise<string> {
  if (!storage) throw new Error('Firebase not configured')

  const storageRef = ref(storage, `thumbnails/${designId}.png`)
  await uploadString(storageRef, dataUrl, 'data_url')
  return getDownloadURL(storageRef)
}

export async function deleteThumbnail(designId: string): Promise<void> {
  if (!storage) throw new Error('Firebase not configured')

  try {
    await deleteObject(ref(storage, `thumbnails/${designId}.png`))
  } catch {
    // Ignore — thumbnail may already be gone
  }
}
