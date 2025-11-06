import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { user } = useAuth();
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

  // User profile
  const userProfile = {
    name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
    avatar: user?.user_metadata?.avatar_url || null,
    username: `@${user?.email?.split("@")[0] || user?.id.slice(0, 8)}`,
  };

  // File handling
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []).slice(0, 4); // Limit to 4 files
      if (files.length === 0) return;

      // Validate file types
      const validFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        return isImage || isVideo;
      });

      if (validFiles.length !== files.length) {
        toast({
          title: "Invalid file type",
          description: "Please select only images or videos.",
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

  // Upload files to Supabase storage
  const uploadFilesToSupabase = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        return publicUrl;
      } catch (error) {
        console.error("Error uploading file:", error);
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  // Create review post mutation
  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to create a review");

      let imageUrls: string[] = [];
      if (media.files.length > 0) {
        try {
          imageUrls = await uploadFilesToSupabase(media.files);
        } catch (error) {
          console.error("Upload failed:", error);
          throw new Error(`Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Create the review post
      const postData = {
        user_id: user.id,
        content,
        privacy: 'public' as const,
        status: 'published' as const,
        rating,
      };

      const { data: post, error } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (error) throw error;

      // Add review tag
      const { data: tagData } = await supabase
        .from("post_tags")
        .select("id")
        .eq("name", "review")
        .single();

      if (tagData) {
        await supabase
          .from("post_tag_mappings")
          .insert({
            post_id: post.id,
            tag_id: tagData.id,
          });
      }

      // Tag the product
      await supabase
        .from("post_tagged_products")
        .insert({
          post_id: post.id,
          product_id: productId,
        });

      // Upload images to post_images table if any
      if (imageUrls.length > 0) {
        const imageData = imageUrls.map((url, index) => ({
          post_id: post.id,
          image_url: url,
          display_order: index,
        }));

        const { error: imageError } = await supabase
          .from("post_images")
          .insert(imageData);

        if (imageError) throw imageError;
      }

      return post;
    },
    onSuccess: () => {
      toast({
        title: "Review Posted!",
        description: "Your review has been published successfully.",
      });

      // Reset form
      setContent("");
      setRating(null);
      setMedia({ files: [], previewUrls: [] });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-review-stats", productId] });
      queryClient.invalidateQueries({ queryKey: ["product-rating", productId] });
      // Invalidate all product-reviews queries for this product (with different sort/filter options)
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
        description: error.message || "Failed to post review",
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
      {/* Header */}
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

      {/* User Info */}
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
          
          {/* Locked Settings */}
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

      {/* Star Rating - Bigger Interface */}
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
          {rating && (
            <span className="text-lg font-medium text-gray-600 dark:text-gray-400">
              ({rating}/5)
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this product..."
          className="w-full min-h-[120px] p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {/* Media Upload */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors duration-200"
            >
              <Image className="w-5 h-5" />
              <span className="text-sm font-medium">Add Photo/Video</span>
            </button>
            {media.files.length > 0 && (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                {media.files.length}/4 files
              </span>
            )}
          </div>
        </div>

        {/* Media Preview */}
        {media.previewUrls.length > 0 && (
          <div className={`grid gap-2 ${
            media.previewUrls.length === 1 ? 'grid-cols-1' :
            media.previewUrls.length === 2 ? 'grid-cols-2' :
            media.previewUrls.length === 3 ? 'grid-cols-3' :
            'grid-cols-2'
          }`}>
            {media.previewUrls.map((url, index) => {
              // Check if the file is a video based on the original file type
              const file = media.files[index];
              const isVideo = file && file.type.startsWith('video/');
              
              return (
                <div 
                  key={index} 
                  className={`relative rounded-xl overflow-hidden ${
                    media.previewUrls.length === 3 && index === 2 ? 'col-span-2' :
                    media.previewUrls.length === 4 && index === 3 ? 'col-span-2' : ''
                  }`}
                >
                  <div className={`${
                    media.previewUrls.length === 1 ? 'aspect-[4/3]' :
                    media.previewUrls.length === 2 ? 'aspect-square' :
                    media.previewUrls.length === 3 && index === 2 ? 'aspect-[2/1]' :
                    media.previewUrls.length === 4 && index === 3 ? 'aspect-[2/1]' :
                    'aspect-square'
                  }`}>
                    {isVideo ? (
                      <video
                        src={url}
                        controls
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={`Media preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Tag Info */}
      <div className="px-4 pb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Reviewing: <span className="font-medium text-gray-900 dark:text-gray-100">{productName}</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,video/ogg,video/mov,video/avi,video/mkv"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ReviewPostCreator; 