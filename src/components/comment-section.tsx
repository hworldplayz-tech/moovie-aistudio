'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import type { Comment } from '@/lib/definitions';
import { mockComments } from '@/lib/data';
import { useAuth } from '@/providers/auth-provider';
import { Send } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';


function CommentCard({ comment }: { comment: Comment }) {
    return (
        <div className="flex gap-4">
            <Avatar>
                <AvatarImage src={comment.avatarUrl} alt={comment.author} />
                <AvatarFallback>{comment.author.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold">{comment.author}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                    </p>
                </div>
                <p className="text-sm text-foreground/80 mt-1">{comment.text}</p>
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-6 border-l">
                        {comment.replies.map(reply => (
                            <CommentCard key={reply.id} comment={reply} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export function CommentSection({ contentId }: { contentId: string }) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>(mockComments);
    const [newComment, setNewComment] = useState('');

    const handlePostComment = () => {
        if (newComment.trim() && user) {
            const comment: Comment = {
                id: `c${Date.now()}`,
                author: user.displayName || 'Anonymous',
                authorId: user.uid,
                avatarUrl: user.photoURL || '',
                text: newComment,
                timestamp: Date.now(),
                replies: [],
            };
            setComments([comment, ...comments]);
            setNewComment('');
        }
    };
    
    return (
        <section className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-2">Comments ({comments.length})</h2>
            <div className="space-y-4">
                {user ? (
                    <div className="flex gap-4">
                        <Avatar>
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                            <AvatarFallback>{(user.displayName || 'U').substring(0,2)}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Textarea 
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="mb-2"
                            />
                            <Button onClick={handlePostComment} disabled={!newComment.trim()}>
                                <Send className="mr-2 h-4 w-4" />
                                Post
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 px-4 bg-card rounded-lg">
                        <p className="text-muted-foreground">
                            <Link href="/login" className="text-primary underline">Sign in</Link> to join the conversation.
                        </p>
                    </div>
                )}
            </div>
            <div className="space-y-6">
                {comments.map(comment => (
                    <CommentCard key={comment.id} comment={comment} />
                ))}
            </div>
        </section>
    );
}
