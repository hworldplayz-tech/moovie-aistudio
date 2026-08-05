
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('Config Project ID:', firebaseConfig.projectId ? 'ok' : 'missing');
console.log('Loading .env from:', require('path').resolve(".env.local"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const CONTENT_COLLECTION = 'manually_added_content';

async function migrate() {
    console.log('Starting migration to adding createdAt...');
    try {
        const querySnapshot = await getDocs(collection(db, CONTENT_COLLECTION));
        let count = 0;

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            if (!data.createdAt) {
                // Backfill createdAt with updatedAt if available, else now
                const createdAt = data.updatedAt || new Date().toISOString();
                await updateDoc(doc(db, CONTENT_COLLECTION, docSnap.id), {
                    createdAt: createdAt
                });
                count++;
                console.log(`Updated ${docSnap.id}: createdAt = ${createdAt}`);
            }
        }
        console.log(`Migration complete. Updated ${count} documents.`);
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
