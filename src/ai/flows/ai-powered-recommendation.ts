'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing personalized movie and TV show recommendations based on user viewing history and like/dislike data.
 *
 * - getPersonalizedRecommendations - A function that retrieves personalized content recommendations for a user.
 * - RecommendationInput - The input type for the getPersonalizedRecommendations function.
 * - RecommendationOutput - The return type for the getPersonalizedRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendationInputSchema = z.object({
  userId: z.string().describe('The ID of the user to generate recommendations for.'),
  viewingHistory: z.array(z.string()).describe('An array of movie/TV show IDs representing the user\'s viewing history.'),
  likedContent: z.array(z.string()).describe('An array of movie/TV show IDs that the user has liked.'),
  dislikedContent: z.array(z.string()).describe('An array of movie/TV show IDs that the user has disliked.'),
});
export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

const RecommendationOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('An array of movie/TV show IDs recommended for the user.'),
});
export type RecommendationOutput = z.infer<typeof RecommendationOutputSchema>;

export async function getPersonalizedRecommendations(input: RecommendationInput): Promise<RecommendationOutput> {
  return aiPoweredRecommendationFlow(input);
}

const recommendationPrompt = ai.definePrompt({
  name: 'recommendationPrompt',
  input: {schema: RecommendationInputSchema},
  output: {schema: RecommendationOutputSchema},
  prompt: `You are an AI movie and TV show recommendation expert. Based on a user's viewing history, liked content, and disliked content, you will suggest movies and TV shows they might enjoy. Only return an array of movie or tv show IDs.

User ID: {{{userId}}}
Viewing History: {{#if viewingHistory}}{{#each viewingHistory}}{{{this}}}, {{/each}}{{else}}None{{/if}}
Liked Content: {{#if likedContent}}{{#each likedContent}}{{{this}}}, {{/each}}{{else}}None{{/if}}
Disliked Content: {{#if dislikedContent}}{{#each dislikedContent}}{{{this}}}, {{/each}}{{else}}None{{/if}}

Recommendations:`, // Use Handlebars to conditionally display lists and handle empty lists
});

const aiPoweredRecommendationFlow = ai.defineFlow(
  {
    name: 'aiPoweredRecommendationFlow',
    inputSchema: RecommendationInputSchema,
    outputSchema: RecommendationOutputSchema,
  },
  async input => {
    const {output} = await recommendationPrompt(input);
    return output!;
  }
);
