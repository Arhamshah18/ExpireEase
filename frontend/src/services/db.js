// src/services/db.js
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export async function addInventoryItem(itemData) {
  try {
    const docRef = await addDoc(collection(db, "inventory"), itemData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
}
