'use server';
/**
 * @fileOverview Server action for updating content in Firestore.
 * Migrated from file-based storage for Vercel compatibility.
 */
import { addContentToFirestore } from '@/lib/firestore';
import type { Content } from '@/lib/definitions';

export async function updateContent(newContent: Content): Promise<{ success: boolean }> {
  try {
    const result = await addContentToFirestore(newContent);
    return result;
  } catch (error) {
    console.error('Failed to update content:', error);
    return { success: false };
  }
}
