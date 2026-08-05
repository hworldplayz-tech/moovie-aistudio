import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from './firebase';
import type { AppUser } from './definitions';

// As we don't have real Firebase credentials, these functions are mocked.
// In a real application, they would interact with the Firebase Auth service.

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  console.log('Mock sign in with email:', email);
  // const userCredential = await signInWithEmailAndPassword(auth, email, password);
  // return userCredential.user;
  if (password === 'password123') {
    return Promise.resolve({
        uid: 'mockuser123',
        email: email,
        displayName: 'Demo User',
        photoURL: 'https://picsum.photos/seed/mockuser123/200/200',
    });
  }
  return Promise.reject(new Error("Invalid credentials"));
}

export async function signUpWithEmail(email: string, password: string): Promise<AppUser> {
  console.log('Mock sign up with email:', email);
  // const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // return userCredential.user;
  return Promise.resolve({
    uid: 'newmockuser456',
    email: email,
    displayName: 'New User',
    photoURL: 'https://picsum.photos/seed/newmockuser456/200/200',
  });
}

export async function signInWithGoogle(): Promise<AppUser> {
  console.log('Mock sign in with Google');
  // const provider = new GoogleAuthProvider();
  // const result = await signInWithPopup(auth, provider);
  // return result.user;
  return Promise.resolve({
    uid: 'googleuser789',
    email: 'google.user@example.com',
    displayName: 'Google User',
    photoURL: 'https://picsum.photos/seed/googleuser789/200/200',
  });
}

export async function signOut(): Promise<void> {
  console.log('Mock sign out');
  // return firebaseSignOut(auth);
  return Promise.resolve();
}
