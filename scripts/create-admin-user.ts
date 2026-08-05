/**
 * Script to create an admin user in Firestore
 * Run with: npx tsx scripts/create-admin-user.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import type { SystemUser } from '../src/lib/definitions';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createAdminUser() {
    try {
        // Create admin user with your credentials
        const adminUser: SystemUser = {
            username: 'hworldplayz',
            password: 'hworldplayz@512',
            role: 'admin',
            createdAt: new Date().toISOString(),
        };

        // Use username as document ID for easy lookup
        await setDoc(doc(db, 'users', adminUser.username), adminUser);

        console.log('✅ Admin user created successfully!');
        console.log('Username:', adminUser.username);
        console.log('Password:', adminUser.password);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser();
