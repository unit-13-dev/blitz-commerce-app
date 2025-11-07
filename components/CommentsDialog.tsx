'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Reply } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface CommentsDialogProps {
  postId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommentsDialog = ({ postId, isOpen, onOpenChange }: CommentsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/posts/${postId}/comments`);
      return data?.data?.comments || [];
    },
    enabled: isOpen && !!postId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Please login to comment');
      const { data } = await apiClient.post(`/posts/${postId}/comments`, { content });
      return data?.data?.comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-feed-posts'] });
      setNewComment("");
      toast({ title: "Comment added!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message, 
        variant: "destructive" 
      });
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Please login to like comments');
      await apiClient.post(`/comments/${commentId}/like`, { like: !isLiked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  const handleLikeComment = (commentId: string, isLiked: boolean) => {
    likeCommentMutation.mutate({ commentId, isLiked });
  };

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                {comment.user.avatar ? (
                  <Avatar 
                    className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                    onClick={() => handleUserClick(comment.user.id)}
                  >
                    <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                    <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium cursor-pointer hover:ring-2 hover:ring-pink-300 transition-all"
                    onClick={() => handleUserClick(comment.user.id)}
                  >
                    {comment.user.name.charAt(0)}
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span 
                      className="font-medium text-sm cursor-pointer hover:text-pink-500 transition-colors"
                      onClick={() => handleUserClick(comment.user.id)}
                    >
                      {comment.user.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLikeComment(comment.id, comment.liked)}
                      disabled={likeCommentMutation.isPending}
                      className={`flex items-center space-x-1 text-xs hover:text-red-500 transition-colors ${
                        comment.liked ? 'text-red-500' : 'text-gray-500'
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${comment.liked ? 'fill-current' : ''}`} />
                      <span>{comment.likes_count}</span>
                    </button>
                    
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="flex items-center space-x-1 text-xs text-gray-500 hover:text-pink-500 transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Reply</span>
                    </button>
                  </div>
                  
                  {replyingTo === comment.id && (
                    <div className="mt-2 flex space-x-2">
                      <Input
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            // For now, just add as regular comment
                            if (replyText.trim()) {
                              addCommentMutation.mutate(`@${comment.user.name} ${replyText}`);
                              setReplyText("");
                              setReplyingTo(null);
                            }
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (replyText.trim()) {
                            addCommentMutation.mutate(`@${comment.user.name} ${replyText}`);
                            setReplyText("");
                            setReplyingTo(null);
                          }
                        }}
                        className="text-xs"
                      >
                        Reply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Add comment input */}
        <div className="border-t pt-4 mt-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddComment();
                }
              }}
            />
            <Button
              onClick={handleAddComment}
              disabled={addCommentMutation.isPending || !newComment.trim()}
              className="bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
            >
              {addCommentMutation.isPending ? 'Posting...' : 'Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
