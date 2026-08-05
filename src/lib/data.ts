import type { Comment } from '@/lib/definitions';

// This file is now mostly for mock comments, as content is fetched from TMDB.
export const mockContent = [];


export const mockComments: Comment[] = [
    {
        id: 'c1',
        author: 'CinephileChris',
        authorId: 'user1',
        avatarUrl: 'https://picsum.photos/seed/avatar1/200/200',
        text: 'This movie was absolutely breathtaking! The cinematography was stunning.',
        timestamp: 1672531200000,
        replies: [
            {
                id: 'c1_r1',
                author: 'MovieMaven',
                authorId: 'user2',
                avatarUrl: 'https://picsum.photos/seed/avatar2/200/200',
                text: 'I agree! I was on the edge of my seat the entire time.',
                timestamp: 1672534800000,
                replies: []
            }
        ]
    },
    {
        id: 'c2',
        author: 'TVJunkieJane',
        authorId: 'user3',
        avatarUrl: 'https://picsum.photos/seed/avatar3/200/200',
        text: 'I couldn\'t get into it. The pacing felt really slow in the beginning.',
        timestamp: 1672617600000,
        replies: []
    }
];
