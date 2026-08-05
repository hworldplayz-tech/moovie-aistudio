'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { getPersonalizedRecommendations } from '@/ai/flows/ai-powered-recommendation';
import { getContentByIds } from '@/lib/tmdb';
import type { Content } from '@/lib/definitions';
import { ContentCarousel } from './content-carousel';
import { Skeleton } from './ui/skeleton';

export default function RecommendedContent() {
  const { user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchRecommendations = async () => {
        setLoading(true);
        try {
          const recommendationInput = {
            userId: user.uid,
            viewingHistory: user.viewingHistory || [],
            likedContent: user.likedContent || [],
            dislikedContent: user.dislikedContent || [],
          };
          
          // In a real app, the AI flow could return a much larger, more diverse set of IDs.
          // For this mock, we'll just use a few to demonstrate.
          // const { recommendations: recommendedIds } = await getPersonalizedRecommendations(recommendationInput);
          // Let's mock the response for predictability in this environment
          const mockRecommendedIds = ['2', '4', '6', '8', '10', '12'].filter(id => !user.viewingHistory?.includes(id));

          if (mockRecommendedIds.length > 0) {
            const recommendedContent = await getContentByIds(mockRecommendedIds);
            setRecommendations(recommendedContent);
          }
        } catch (error) {
          console.error('Failed to fetch recommendations:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchRecommendations();
    }
  }, [user]);

  if (authLoading || !user) {
    return null;
  }
  
  if (loading) {
    return (
        <section>
            <h2 className="text-2xl font-bold mb-4">Recommended For You</h2>
            <div className="flex space-x-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1/6">
                        <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                        <Skeleton className="h-3 w-1/2 mt-1" />
                    </div>
                ))}
            </div>
        </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return <ContentCarousel title="Recommended For You" content={recommendations} />;
}
