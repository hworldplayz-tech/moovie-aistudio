'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { setupAdminUser } from '../setup-admin';

export default function SetupPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

    const handleSetup = async () => {
        setLoading(true);
        setResult(null);

        try {
            const res = await setupAdminUser();
            setResult(res);
        } catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Setup Admin User</CardTitle>
                    <CardDescription>
                        Click the button below to create your admin account in Firestore
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={handleSetup}
                        disabled={loading || result?.success}
                        className="w-full"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {result?.success ? 'Admin Created ✓' : 'Create Admin User'}
                    </Button>

                    {result && (
                        <div className={`p-4 rounded-lg border ${result.success
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                            }`}>
                            <div className="flex items-start gap-2">
                                {result.success ? (
                                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                ) : (
                                    <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="space-y-1">
                                    <p className="font-medium">
                                        {result.success ? 'Success!' : 'Error'}
                                    </p>
                                    <p className="text-sm">
                                        {result.message || result.error}
                                    </p>
                                    {result.success && (
                                        <div className="mt-3 text-sm space-y-1">
                                            <p><strong>Username:</strong> hworldplayz</p>
                                            <p><strong>Password:</strong> hworldplayz@512</p>
                                            <p className="mt-2 text-xs opacity-75">
                                                You can now login at <a href="/admin" className="underline">/admin</a>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                        ⚠️ Delete this page after creating your admin account
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
