'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Film,
  Tv,
  ExternalLink,
  User,
  Clock,
  CheckCircle2,
  Layers,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllCommentsFromFirestore, updateCommentInFirestore, deleteCommentFromFirestore } from '@/lib/firestore';
import type { Comment } from '@/lib/definitions';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface MovieCommentsGroup {
  contentId: string;
  contentTitle: string;
  contentType: 'movie' | 'tv' | string;
  comments: Comment[];
  latestTimestamp: number;
}

export default function AdminCommentsManagement() {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMovies, setExpandedMovies] = useState<Record<string, boolean>>({});

  // Editing state
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editAuthor, setEditAuthor] = useState('');
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deleting state
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllCommentsFromFirestore();
      setComments(data);
    } catch (error) {
      console.error('Error fetching admin comments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load comments from database.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Group comments by movie / contentId
  const groupedComments = useMemo(() => {
    const groupsMap = new Map<string, MovieCommentsGroup>();

    comments.forEach((c) => {
      const key = String(c.contentId || 'unknown');
      const existing = groupsMap.get(key);
      const time = typeof c.timestamp === 'number'
        ? c.timestamp
        : (c.createdAt ? new Date(c.createdAt).getTime() : 0);

      if (existing) {
        existing.comments.push(c);
        if (time > existing.latestTimestamp) {
          existing.latestTimestamp = time;
        }
        if (!existing.contentTitle && c.contentTitle) {
          existing.contentTitle = c.contentTitle;
        }
      } else {
        groupsMap.set(key, {
          contentId: key,
          contentTitle: c.contentTitle || 'Untitled Movie/Show',
          contentType: c.contentType || 'movie',
          comments: [c],
          latestTimestamp: time,
        });
      }
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [comments]);

  // Filter groups based on search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedComments;
    const term = searchTerm.toLowerCase();

    return groupedComments
      .map((group) => {
        const titleMatch = group.contentTitle.toLowerCase().includes(term);
        const matchingComments = group.comments.filter(
          (c) =>
            c.author.toLowerCase().includes(term) ||
            c.text.toLowerCase().includes(term) ||
            (c.contentTitle && c.contentTitle.toLowerCase().includes(term))
        );

        if (titleMatch) {
          return group;
        }
        if (matchingComments.length > 0) {
          return {
            ...group,
            comments: matchingComments,
          };
        }
        return null;
      })
      .filter((g): g is MovieCommentsGroup => g !== null);
  }, [groupedComments, searchTerm]);

  const toggleExpand = (contentId: string) => {
    setExpandedMovies((prev) => ({
      ...prev,
      [contentId]: !prev[contentId],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredGroups.forEach((g) => {
      allExpanded[g.contentId] = true;
    });
    setExpandedMovies(allExpanded);
  };

  const collapseAll = () => {
    setExpandedMovies({});
  };

  // Open Edit Dialog
  const handleOpenEdit = (comment: Comment) => {
    setEditingComment(comment);
    setEditAuthor(comment.author || '');
    setEditText(comment.text || '');
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingComment) return;
    if (!editText.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Comment text cannot be empty.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateCommentInFirestore(editingComment.id, {
        author: editAuthor.trim() || 'Anonymous',
        text: editText.trim(),
      });

      if (res.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === editingComment.id
              ? { ...c, author: editAuthor.trim() || 'Anonymous', text: editText.trim(), updatedAt: new Date().toISOString() }
              : c
          )
        );
        toast({ title: 'Success', description: 'Comment updated successfully.' });
        setEditingComment(null);
      } else {
        throw new Error(res.error || 'Failed to update comment');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Could not update comment.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Comment
  const handleConfirmDelete = async () => {
    if (!deletingCommentId) return;

    setIsDeleting(true);
    try {
      const res = await deleteCommentFromFirestore(deletingCommentId);
      if (res.success) {
        setComments((prev) => prev.filter((c) => c.id !== deletingCommentId));
        toast({ title: 'Deleted', description: 'Comment removed from database.' });
        setDeletingCommentId(null);
      } else {
        throw new Error(res.error || 'Failed to delete comment');
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Could not delete comment.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{comments.length}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Movies & Shows with Comments</CardTitle>
            <Film className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{groupedComments.length}</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Latest Activity</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : comments.length > 0 ? (
              <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                {formatDistanceToNow(new Date(comments[0].timestamp || comments[0].createdAt || Date.now()), { addSuffix: true })}
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-muted-foreground">No comments yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Comments Management
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                View comments grouped by movie, expand to read discussions, and edit or delete any comment.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchComments}
                disabled={isLoading}
                className="text-xs h-9 px-3"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="text-xs h-9 px-2.5"
              >
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="text-xs h-9 px-2.5"
              >
                Collapse All
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by movie name, commenter username, or comment text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-9 sm:h-10 bg-background"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 px-4 bg-muted/20 rounded-xl border border-dashed text-muted-foreground space-y-3">
              <MessageSquare className="h-10 w-10 mx-auto opacity-40 text-primary" />
              <p className="text-sm sm:text-base font-medium text-foreground">
                {searchTerm ? 'No comments match your search query.' : 'No comments found in the database.'}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchTerm ? 'Try adjusting your search keywords.' : 'When users post comments on watch pages, they will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => {
                const isExpanded = !!expandedMovies[group.contentId];
                const count = group.comments.length;

                return (
                  <div
                    key={group.contentId}
                    className="border rounded-xl bg-card overflow-hidden transition-all shadow-sm"
                  >
                    {/* Movie Group Header Bar */}
                    <div
                      onClick={() => toggleExpand(group.contentId)}
                      className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-muted/40 cursor-pointer select-none transition-colors gap-3 flex-wrap sm:flex-nowrap"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {group.contentType === 'tv' ? (
                            <Tv className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Film className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                            {group.contentTitle}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">
                            ID: {group.contentId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                        {/* Comments Count Badge */}
                        <Badge
                          variant="secondary"
                          className="font-medium text-xs px-2.5 py-0.5 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {count} {count === 1 ? 'comment' : 'comments'}
                        </Badge>

                        {/* Link to detail watch page */}
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                          title="Open watch page"
                        >
                          <Link href={`/watch/${group.contentId}`} target="_blank">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>

                        {/* Dropdown Toggle Chevron */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs flex items-center gap-1 font-medium"
                        >
                          {isExpanded ? (
                            <>
                              Hide <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              View All <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Comments List for this movie */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10 p-3.5 sm:p-4 space-y-3">
                        {group.comments.map((comment) => {
                          let formattedDate = 'Recent';
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
                            <div
                              key={comment.id}
                              className="bg-card border rounded-lg p-3 sm:p-3.5 flex flex-col sm:flex-row justify-between gap-3 shadow-2xs hover:border-primary/30 transition-colors"
                            >
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {comment.author || 'Anonymous'}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    • {formattedDate}
                                  </span>
                                  {comment.updatedAt && (
                                    <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 text-muted-foreground">
                                      Edited
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed break-words bg-muted/20 p-2 rounded">
                                  {comment.text}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEdit(comment)}
                                  className="h-7 sm:h-8 text-xs px-2.5 text-foreground hover:bg-muted"
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setDeletingCommentId(comment.id)}
                                  className="h-7 sm:h-8 text-xs px-2.5"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Comment Dialog */}
      <Dialog open={!!editingComment} onOpenChange={(open) => !open && setEditingComment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" /> Edit Comment
            </DialogTitle>
            <DialogDescription>
              Modify the commenter name or comment content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Commenter Name</label>
              <Input
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                placeholder="Author Name"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Comment Text</label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Comment text..."
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingComment(null)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editText.trim()}>
              {isSavingEdit ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deletingCommentId} onOpenChange={(open) => !open && setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Comment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
