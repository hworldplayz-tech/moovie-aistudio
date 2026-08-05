/**
 * Migration Script: Add Slugs to Existing Content
 * 
 * This script adds SEO-friendly slugs to all existing content in Firestore.
 * Slugs are generated in the format: "download-{title-slug}"
 * 
 * Run this ONCE after deploying the slug URL changes.
 * 
 * Usage: npx ts-node scripts/add-slugs.ts
 */

import { getContentFromFirestore, addContentToFirestore } from '../src/lib/firestore.js';
import { slugify } from '../src/lib/utils.js';

async function addSlugs() {
    console.log('🚀 Starting slug migration...');

    const allContent = await getContentFromFirestore();
    console.log(`📊 Found ${allContent.length} content items`);

    let updated = 0;
    let skipped = 0;

    for (const content of allContent) {
        // Skip if already has a slug
        if (content.slug) {
            console.log(`⏭️  Skipping "${content.title}" (already has slug: ${content.slug})`);
            skipped++;
            continue;
        }

        // Generate slug
        const slug = `download-${slugify(content.title)}`;

        // Update content with slug
        try {
            await addContentToFirestore({
                ...content,
                slug
            });
            console.log(`✅ Updated "${content.title}" with slug: ${slug}`);
            updated++;
        } catch (error) {
            console.error(`❌ Failed to update "${content.title}":`, error);
        }
    }

    console.log('\n🎉 Migration complete!');
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${allContent.length}`);
}

addSlugs()
    .then(() => {
        console.log('\n✨ All done! You can now use slug-based URLs.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    });
