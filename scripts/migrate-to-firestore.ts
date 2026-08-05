
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: "AIzaSyDfHacRQKUhbeGXx-YuaMJjCTcFs8CYgNo",
    authDomain: "studio-1095783527-40951.firebaseapp.com",
    projectId: "studio-1095783527-40951",
    storageBucket: "studio-1095783527-40951.firebasestorage.app",
    messagingSenderId: "78347104240",
    appId: "1:78347104240:web:d9918ba5d86b48dee53735"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const CONTENT_COLLECTION = 'manually_added_content';

async function migrate() {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'added-content.json');

    try {
        const fileData = await fs.readFile(filePath, 'utf-8');
        const contentList = JSON.parse(fileData);

        console.log(`Found ${contentList.length} items to migrate...`);

        for (const content of contentList) {
            const contentRef = doc(db, CONTENT_COLLECTION, String(content.id));
            await setDoc(contentRef, {
                ...content,
                updatedAt: new Date().toISOString(),
            });
            console.log(`Migrated: ${content.title} (${content.id})`);
        }

        console.log('Migration completed successfully! 🎉');
    } catch (error) {
        if ((error as any).code === 'ENOENT') {
            console.log('No local content file found to migrate.');
        } else {
            console.error('Migration failed:', error);
        }
    }
}

migrate();
