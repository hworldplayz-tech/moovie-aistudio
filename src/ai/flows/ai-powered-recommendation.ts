'use server';

export type RecommendationInput = {
  userId: string;
  viewingHistory: string[];
  likedContent: string[];
  dislikedContent: string[];
};

export type RecommendationOutput = {
  recommendations: string[];
};

export async function getPersonalizedRecommendations(input: RecommendationInput): Promise<RecommendationOutput> {
  const viewed = new Set(input.viewingHistory || []);
  const pool = ['2', '4', '6', '8', '10', '12'];
  return {
    recommendations: pool.filter(id => !viewed.has(id)),
  };
}

