'use server';
/**
 * @fileOverview Server action for deleting content from Firestore.
 * Migrated from file-based storage for Vercel compatibility.
 */
import { deleteContentFromFirestore } from '@/lib/firestore';

export async function deleteContent(ids: string[]): Promise<{ success: boolean }> {
  try {
    const result = await deleteContentFromFirestore(ids);
    return result;
  } catch (error) {
    console.error('Failed to delete content:', error);
    return { success: false };
  }
}
