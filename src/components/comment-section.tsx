'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import type { Comment } from '@/lib/definitions';
import { getCommentsByContentId, addCommentToFirestore } from '@/lib/firestore';
import { MessageSquare, Send, User, Loader2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

interface CommentSectionProps {
  contentId: string;
  contentTitle?: string;
  contentType?: 'movie' | 'tv' | string;
}

const AVATAR_COLORS = [
  'bg-red-500/20 text-red-500 border-red-500/30',
  'bg-amber-500/20 text-amber-500 border-amber-500/30',
  'bg-emerald-500/20 text-emerald-500 border-emerald-500/30',
  'bg-blue-500/20 text-blue-500 border-blue-500/30',
  'bg-indigo-500/20 text-indigo-500 border-indigo-500/30',
  'bg-purple-500/20 text-purple-500 border-purple-500/30',
  'bg-pink-500/20 text-pink-500 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
];

function getAvatarColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function CommentItem({ comment }: { comment: Comment }) {
  const authorName = comment.author || 'Anonymous';
  const colorClass = getAvatarColorClass(authorName);
  const initials = getInitials(authorName);

  let formattedDate = 'Just now';
  try {
    const timeMs = typeof comment.timestamp === 'number'
      ? comment.timestamp
      : (comment.createdAt ? new Date(comment.createdAt).getTime() : Date.now());
    if (!isNaN(timeMs)) {
      formattedDate = formatDistanceToNow(new Date(timeMs), { addSuffix: true });
    }
  } catch (e) {
    formattedDate = 'Recently';
  }

  return (
    <div className="flex gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-card border border-border/60 shadow-sm transition-all hover:border-border">
      <Avatar className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full border shrink-0 flex items-center justify-center font-bold text-xs sm:text-sm ${colorClass}`}>
        <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm sm:text-base text-foreground truncate">
            {authorName}
          </span>
          <span className="text-[11px] sm:text-xs text-muted-foreground shrink-0">
            {formattedDate}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
          {comment.text}
        </p>
      </div>
    </div>
  );
}

export function CommentSection({ contentId, contentTitle, contentType = 'movie' }: CommentSectionProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved commenter name from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_comment_name');
      if (saved) {
        setAuthorName(saved);
      }
    } catch (e) {
      // Ignore localStorage errors in iframe / restricted env
    }
  }, []);

  // Fetch comments from Firestore
  const fetchComments = useCallback(async () => {
    if (!contentId) return;
    try {
      const data = await getCommentsByContentId(String(contentId));
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAuthor = authorName.trim();
    const cleanText = commentText.trim();

    if (!cleanAuthor) {
      toast({
        variant: 'destructive',
        title: 'Name Required',
        description: 'Please enter your name to post a comment.',
      });
      return;
    }

    if (!cleanText) {
      toast({
        variant: 'destructive',
        title: 'Comment Required',
        description: 'Please type your comment message.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save name for convenience
      try {
        localStorage.setItem('user_comment_name', cleanAuthor);
      } catch (e) {
        // Safe fallback
      }

      const res = await addCommentToFirestore({
        contentId: String(contentId),
        contentTitle: contentTitle || 'Untitled Movie/Show',
        contentType: contentType || 'movie',
        author: cleanAuthor,
        text: cleanText,
      });

      if (res.success && res.comment) {
        setComments(prev => [res.comment!, ...prev]);
        setCommentText('');
        toast({
          title: 'Comment Posted!',
          description: 'Thank you for sharing your thoughts.',
        });
      } else {
        throw new Error(res.error || 'Failed to submit comment');
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Could not post comment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6" id="comments-section">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Comments
          <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1.5 px-2 py-0.5 rounded-full bg-muted border">
            {isLoading ? '...' : comments.length}
          </span>
        </h2>
      </div>

      {/* Simple 2-Input Comment Form */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Leave a Comment
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Your Name
            </label>
            <Input
              placeholder="e.g. Alex, John M, MovieFan99"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              disabled={isSubmitting}
              className="bg-background/80 h-9 sm:h-10 text-sm"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Your Comment
            </label>
            <Textarea
              placeholder="Share your thoughts, review, or questions about this title..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="bg-background/80 text-sm resize-none"
              maxLength={1000}
              required
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || !authorName.trim() || !commentText.trim()}
              className="h-9 sm:h-10 px-5 font-semibold text-xs sm:text-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Post Comment
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-card border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 px-4 bg-muted/20 rounded-xl border border-dashed border-border/80 text-muted-foreground space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-medium text-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">Be the first to share your thoughts about this movie!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </section>
  );
}
