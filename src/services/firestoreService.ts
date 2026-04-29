import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { DesignDoc, DesignDocFirestore } from '../types'

const COLLECTION = 'designs'

export async function saveDesign(
  design: Omit<DesignDoc, 'id'>,
): Promise<string> {
  if (!db) throw new Error('Firebase not configured')

  const payload: DesignDocFirestore = {
    title: design.title,
    createdAt: Timestamp.fromDate(design.createdAt),
    symmetrySteps: design.symmetrySteps,
    objectsData: JSON.stringify(design.objectsData),
    thumbnailUrl: design.thumbnailUrl,
  }

  const ref = await addDoc(collection(db, COLLECTION), payload)
  return ref.id
}

export async function loadDesigns(): Promise<DesignDoc[]> {
  if (!db) throw new Error('Firebase not configured')

  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data() as DesignDocFirestore
    return {
      id: d.id,
      title: data.title,
      createdAt: (data.createdAt as Timestamp).toDate(),
      symmetrySteps: data.symmetrySteps,
      objectsData: JSON.parse(data.objectsData),
      thumbnailUrl: data.thumbnailUrl,
    }
  })
}

export async function deleteDesign(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured')
  await deleteDoc(doc(db, COLLECTION, id))
}
