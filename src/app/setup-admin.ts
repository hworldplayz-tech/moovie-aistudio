'use server';

import { createSystemUser } from '@/lib/firestore';
import type { SystemUser } from '@/lib/definitions';

/**
 * One-time setup function to create the admin user
 * Call this from a temporary page or API route
 */
export async function setupAdminUser() {
    try {
        console.log('🔄 Starting admin user setup...');

        const adminUser: SystemUser = {
            username: 'hworldplayz',
            password: 'hworldplayz@512',
            role: 'admin',
            createdAt: new Date().toISOString(),
        };

        console.log('📝 Creating user:', { username: adminUser.username, role: adminUser.role });

        const result = await createSystemUser(adminUser);

        console.log('✅ Create user result:', result);

        if (result.success) {
            return {
                success: true,
                message: `Admin user '${adminUser.username}' created successfully!`
            };
        } else {
            console.error('❌ Failed to create user:', result.error);
            return {
                success: false,
                error: result.error || 'Failed to create admin user'
            };
        }
    } catch (error) {
        console.error('❌ Error in setupAdminUser:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
