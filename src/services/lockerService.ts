// services/lockerServices.ts
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { getApp } from "firebase/app";

const db = getFirestore(getApp());

export interface Locker {
  id: string;
  name: string;
  username: string;
  password: string;
}

// Helper: get the lockers collection reference for a given user UID
function getUserLockersCollection(uid: string) {
  return collection(db, "users", uid, "lockers");
}

// Subscribe to real-time updates for the user's lockers
export function subscribeToUserLockers(
  uid: string,
  onUpdate: (lockers: Locker[]) => void,
  onError?: (error: Error) => void
): () => void {
  const lockersRef = getUserLockersCollection(uid);
  const q = query(lockersRef, orderBy("name"));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const lockers: Locker[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Locker, "id">),
      }));
      onUpdate(lockers);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

// Add a new locker for the user
export async function addLocker(uid: string, locker: Omit<Locker, "id">) {
  const lockersRef = getUserLockersCollection(uid);
  const docRef = await addDoc(lockersRef, locker);
  return docRef.id;
}

// Delete a locker by ID for the user
export async function deleteLocker(uid: string, lockerId: string) {
  const lockerDocRef = doc(db, "users", uid, "lockers", lockerId);
  await deleteDoc(lockerDocRef);
}

// Update a locker by ID for the user
export async function updateLocker(
  uid: string,
  lockerId: string,
  updatedFields: Partial<Omit<Locker, "id">>
) {
  const lockerDocRef = doc(db, "users", uid, "lockers", lockerId);
  await updateDoc(lockerDocRef, updatedFields);
}
