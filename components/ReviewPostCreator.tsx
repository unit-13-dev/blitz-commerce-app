'use client';

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Star, Tag, Globe, Image, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReviewPostCreatorProps {
  productId: string;
  productName: string;
  onPostCreated?: () => void;
}

interface MediaState {
  files: File[];
  previewUrls: string[];
}

const ReviewPostCreator: React.FC<ReviewPostCreatorProps> = ({ 
  productId, 
  productName, 
  onPostCreated 
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaState>({
    files: [],
    previewUrls: [],
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfile = {
    name: profile?.fullName || user?.name || user?.email?.split("@")[0] || "User",
    avatar: profile?.avatarUrl || user?.image || null,
    username: `@${user?.email?.split("@")[0] || user?.id?.slice(0, 8) || 'user'}`,
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []).slice(0, 4);
      if (files.length === 0) return;

      const validFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        return isImage;
      });

      if (validFiles.length !== files.length) {
        toast({
          title: "Invalid file type",
          description: "Please select only images.",
          variant: "destructive",
        });
      }

      setMedia((prev) => {
        const newFiles = [...prev.files, ...validFiles].slice(0, 4);
        const newUrls = [
          ...prev.previewUrls,
          ...validFiles.map((file) => URL.createObjectURL(file)),
        ].slice(0, 4);
        return { files: newFiles, previewUrls: newUrls };
      });
    },
    [toast]
  );

  const removeFile = useCallback((index: number) => {
    setMedia((prev) => {
      URL.revokeObjectURL(prev.previewUrls[index]);
      return {
        files: prev.files.filter((_, i) => i !== index),
        previewUrls: prev.previewUrls.filter((_, i) => i !== index),
      };
    });
  }, []);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const folder = `posts/${user?.id ?? 'shared'}`;
    const { uploadToCloudinary: uploadFile } = await import('@/lib/cloudinary-client');
    return uploadFile(file, folder);
  };

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to create a review");

      let imageUrls: string[] = [];
      if (media.files.length > 0) {
        try {
          imageUrls = await Promise.all(media.files.map(file => uploadToCloudinary(file)));
        } catch (error) {
          console.error("Upload failed:", error);
          throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const { data } = await apiClient.post('/posts', {
        content,
        privacy: 'public',
        status: 'published',
        rating,
        images: imageUrls.map((url, index) => ({
          imageUrl: url,
          displayOrder: index,
        })),
        tags: ['review'],
        taggedProducts: [productId],
      });

      return data.post;
    },
    onSuccess: () => {
      toast({
        title: "Review Posted!",
        description: "Your review has been published successfully.",
      });

      setContent("");
      setRating(null);
      setMedia({ files: [], previewUrls: [] });

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-rating", productId] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'product-reviews' && 
          query.queryKey[1] === productId 
      });

      if (onPostCreated) {
        onPostCreated();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to post review",
        variant: "destructive",
      });
    },
  });

  const handlePost = () => {
    if (!content.trim()) {
      toast({
        title: "Review Required",
        description: "Please write your review before posting.",
        variant: "destructive",
      });
      return;
    }

    if (!rating) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before posting.",
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate();
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Please log in to write a review for this product.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Write a Review
        </h3>
        <Button
          onClick={handlePost}
          disabled={
            createReviewMutation.isPending ||
            !content.trim() ||
            !rating
          }
          className="bg-pink-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-pink-600 disabled:bg-pink-300 transition-colors duration-200"
        >
          {createReviewMutation.isPending ? "Posting..." : "Post Review"}
        </Button>
      </div>

      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {userProfile.avatar ? (
            <Avatar className="w-10 h-10 border border-gray-200 dark:border-gray-700 rounded-full">
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
              <AvatarFallback className="bg-pink-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                {userProfile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 rounded-full bg-pink-200 dark:bg-gray-600 flex items-center justify-center text-gray-800 dark:text-gray-200">
              {userProfile.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-base font-medium text-gray-900 dark:text-white truncate">
              {userProfile.name}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {userProfile.username}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Badge variant="secondary" className="bg-pink-50 text-pink-700 border-pink-200">
              <Tag className="w-3 h-3 mr-1" />
              Review
            </Badge>
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Globe className="w-3 h-3 mr-1" />
              Public
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center space-x-3">
          <span className="text-base font-medium text-gray-700 dark:text-gray-300">Rating:</span>
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-4xl transition-colors duration-200 ${
                  rating && rating >= star ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 hover:scale-110 transform`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Share your experience with ${productName}...`}
          className="w-full min-h-[120px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
          maxLength={2000}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {content.length}/2000 characters
          </p>
        </div>
      </div>

      {media.previewUrls.length > 0 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            {media.previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={media.files.length >= 4}
            className="flex items-center space-x-2"
          >
            <Image className="w-4 h-4" />
            <span>Add Photos ({media.files.length}/4)</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPostCreator;
