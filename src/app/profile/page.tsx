'use client';

import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentCarousel } from "@/components/content-carousel";
import { getContentByIds } from "@/lib/tmdb";
import type { Content } from "@/lib/definitions";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [likedContent, setLikedContent] = useState<Content[]>([]);
    const [historyContent, setHistoryContent] = useState<Content[]>([]);
    const [loadingContent, setLoadingContent] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            const fetchUserContent = async () => {
                setLoadingContent(true);
                try {
                    const [liked, history] = await Promise.all([
                        user.likedContent ? getContentByIds(user.likedContent) : Promise.resolve([]),
                        user.viewingHistory ? getContentByIds(user.viewingHistory) : Promise.resolve([]),
                    ]);
                    setLikedContent(liked);
                    setHistoryContent(history);
                } catch (error) {
                    console.error("Failed to fetch user content", error);
                } finally {
                    setLoadingContent(false);
                }
            };
            fetchUserContent();
        }
    }, [user]);

    if (authLoading || !user) {
        return (
             <div className="space-y-8 p-4 md:p-6 lg:p-8">
                <div className="flex items-center space-x-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
             </div>
        );
    }

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-8 p-4 md:p-6 lg:p-8">
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-center gap-6 space-y-0">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold">{user.displayName}</h1>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="outline">Edit Profile</Button>
                </CardHeader>
            </Card>

            {loadingContent ? (
                 <section>
                    <Skeleton className="h-8 w-48 mb-4" />
                    <div className="flex space-x-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="w-1/6">
                                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <>
                    {likedContent.length > 0 && <ContentCarousel title="Liked Content" content={likedContent} />}
                    {historyContent.length > 0 && <ContentCarousel title="Viewing History" content={historyContent} />}
                </>
            )}

            
        </div>
    );
}
