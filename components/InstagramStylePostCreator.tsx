'use client';

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  X,
  Image,
  Video,
  Smile,
  AtSign,
  User,
  ShoppingBag,
  Users,
  Globe,
  Lock,
  FileText,
  Tag,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductTagCard from "./ProductTagCard";

// Define interfaces
interface PostData {
  content: string;
  imageUrls?: string[];
  postTag?: string;
  privacy: 'public' | 'following' | 'draft';
  status: 'published' | 'draft';
  selectedProducts: string[];
  selectedUsers: string[];
  rating?: number | null;
}

interface MediaState {
  files: File[];
  previewUrls: string[];
}

interface TaggableEntity {
  id: string;
  name: string;
  username?: string; // For users
  type: "user" | "product";
  price?: number;
  image_url?: string | null;
  vendor_id?: string;
}

interface TaggableEntities {
  users: TaggableEntity[];
  products: TaggableEntity[];
}

// Define post tags
const postTags = [
  { value: "review", label: "Review" },
  { value: "tutorial", label: "Tutorial" },
  { value: "unboxing", label: "Unboxing" },
  { value: "question", label: "Question" },
  { value: "announcement", label: "Announcement" },
];

// Define privacy options
const privacyOptions = [
  { value: "public", label: "Public", icon: Globe },
  { value: "following", label: "Following", icon: Users },
  { value: "draft", label: "Draft", icon: FileText },
];

interface InstagramStylePostCreatorProps {
  onPostCreated?: () => void;
}

const InstagramStylePostCreator = ({
  onPostCreated,
}: InstagramStylePostCreatorProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaState>({
    files: [],
    previewUrls: [],
  });
  const [selectedPostTag, setSelectedPostTag] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'following' | 'draft'>('public');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchTaggableEntities = useCallback(async (search: string) => {
    const searchTerm = search.trim();
    if (!searchTerm) {
      return { users: [], products: [] };
    }

    const { data } = await apiClient.get('/search', {
      params: { q: searchTerm, type: 'all' },
    });

    return {
      users: data?.users || [],
      products: data?.products || [],
    };
  }, []);

  const {
    data: taggableEntities = { users: [], products: [] },
    isLoading: isLoadingTags,
  } = useQuery<TaggableEntities>({
    queryKey: ["taggableEntities", tagSearch],
    queryFn: () => fetchTaggableEntities(tagSearch),
    enabled: isTagModalOpen,
  });

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const folder = `posts/${user?.id ?? 'shared'}`;
    const { uploadToCloudinary: uploadFile } = await import('@/lib/cloudinary-client');
    return uploadFile(file, folder);
  };

  const createPostMutation = useMutation({
    mutationFn: async ({ content, imageUrls, postTag, privacy, status, selectedProducts, selectedUsers, rating }: PostData) => {
      if (!user) throw new Error("Please log in to create a post");

      let uploadedImageUrls: string[] = [];
      if (imageUrls && imageUrls.length > 0 && media.files.length > 0) {
        uploadedImageUrls = await Promise.all(
          media.files.map(file => uploadToCloudinary(file))
        );
        uploadedImageUrls = uploadedImageUrls.filter(url => url);
      }

      if (status === 'draft') {
        const { data } = await apiClient.post('/drafts', {
          content,
          privacy,
        });
        return data.draft;
      } else {
        const { data } = await apiClient.post('/posts', {
          content,
          privacy,
          status: 'published',
          rating: postTag === 'review' ? rating : null,
          images: uploadedImageUrls,
          tags: postTag ? [postTag] : undefined,
          taggedProducts: selectedProducts || undefined,
        });
        return data.post;
      }
    },
    onSuccess: (data) => {
      toast({
        title: privacy === 'draft' ? "Draft Saved!" : "Post Created!",
        description: privacy === 'draft'
          ? "Your draft has been saved successfully."
          : "Your post has been published successfully.",
      });

      // Reset form
      setContent("");
      setMedia({ files: [], previewUrls: [] });
      setSelectedPostTag(null);
      setPrivacy('public');
      setSelectedProducts([]);
      setSelectedUsers([]);
      setIsTagModalOpen(false);

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["social-feed-posts"] });

      if (onPostCreated) {
        onPostCreated();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  // File handling
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []).slice(0, 4); // Limit to 4 files (images/videos)
      if (files.length === 0) return;

      setMedia((prev) => {
        const newFiles = [...prev.files, ...files].slice(0, 4);
        const newUrls = [
          ...prev.previewUrls,
          ...files.map((file) => URL.createObjectURL(file)),
        ].slice(0, 4);
        return { files: newFiles, previewUrls: newUrls };
      });
    },
    []
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


  const handlePost = useCallback(async () => {
    if (!content.trim() && media.files.length === 0 && !selectedPostTag) {
      toast({
        title: "Empty post",
        description:
          "Please add some content, select a file, or choose a tag to post.",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate({
      content,
      imageUrls: media.previewUrls,
      postTag: selectedPostTag || undefined,
      privacy,
      status: privacy === 'draft' ? 'draft' : 'published',
      selectedProducts,
      selectedUsers,
      rating,
    });
  }, [
    content,
    media.previewUrls,
    media.files,
    selectedPostTag,
    privacy,
    createPostMutation,
    toast,
    selectedProducts,
    selectedUsers,
    rating,
  ]);

  // Category and privacy handlers
  const handleCategorySelect = useCallback((tag: string) => {
    setSelectedPostTag(prev => prev === tag ? null : tag);
  }, []);

  const handlePrivacySelect = useCallback((value: 'public' | 'following' | 'draft') => {
    setPrivacy(value);
  }, []);

  const handleProductSelect = useCallback((productId: string) => {
    console.log('Product selected:', productId);
    // Select only one product at a time
    setSelectedProducts([productId]);
    // Close the modal automatically
    setIsTagModalOpen(false);
  }, []);

  const handleUserSelect = useCallback((userId: string, username: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });

    // Add only username to content for clean display
    setContent(prev => {
      const cursorPosition = textareaRef.current?.selectionStart || prev.length;
      const beforeCursor = prev.slice(0, cursorPosition);
      const afterCursor = prev.slice(cursorPosition);
      return beforeCursor + username + " " + afterCursor;
    });

    // Close the modal
    setIsTagModalOpen(false);
  }, []);

  const userProfile = {
    name: profile?.fullName || user?.name || user?.email?.split("@")[0] || "User",
    avatar: profile?.avatarUrl || user?.image || null,
    username: `@${user?.email?.split("@")[0] || user?.id?.slice(0, 8) || 'user'}`,
  };

  return (
    <div className=" dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create Post
        </h3>
        <Button
          onClick={handlePost}
          disabled={
            createPostMutation.isPending ||
            (!content.trim() && media.files.length === 0 && !selectedPostTag)
          }
          className="bg-pink-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-pink-600 disabled:bg-pink-300 transition-colors duration-200"
        >
          {createPostMutation.isPending ? "Sharing..." : "Share"}
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
          {selectedPostTag && (
            <span className="text-sm font-medium text-pink-600 dark:text-pink-400 flex items-center space-x-1 ml-2">
              <Tag className="w-4 h-4" />
              <span>{selectedPostTag}</span>
            </span>
          )}
          {selectedProducts.length > 0 && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center space-x-1 ml-2">
              <ShoppingBag className="w-4 h-4" />
              <span>1 product tagged</span>
            </span>
          )}
        </div>
        <Select onValueChange={handlePrivacySelect} value={privacy}>
          <SelectTrigger className="w-[180px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all duration-200">
            <SelectValue placeholder="Select Privacy" />
          </SelectTrigger>
          <SelectContent>
            {privacyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center space-x-2">
                  <option.icon className="w-4 h-4" />
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Star Rating for Review Posts */}
      {selectedPostTag === 'review' && (
        <div className="px-4 pb-3">
          <div className="flex items-center space-x-3">
            <span className="text-base font-medium text-gray-700 dark:text-gray-300">Rating:</span>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-colors duration-200 ${rating && rating >= star ? 'text-yellow-400' : 'text-gray-300'
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
      )}

      {/* Content */}
      <div className="px-4 pb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full min-h-[120px] p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        />
      </div>

      {/* Media Preview */}
      {media.previewUrls.length > 0 && (
        <div className="px-4 py-3">
          <div className={`grid gap-1 rounded-xl overflow-hidden ${media.previewUrls.length === 1 ? 'grid-cols-1' :
              media.previewUrls.length === 2 ? 'grid-cols-2' :
                media.previewUrls.length === 3 ? 'grid-cols-3' :
                  'grid-cols-2'
            }`}>
            {media.previewUrls.map((url, index) => (
              <div
                key={index}
                className={`relative group ${media.previewUrls.length === 3 && index === 2 ? 'col-span-2' :
                    media.previewUrls.length === 4 && index === 3 ? 'col-span-2' : ''
                  }`}
              >
                <div className={`${media.previewUrls.length === 1 ? 'aspect-[4/3]' :
                    media.previewUrls.length === 2 ? 'aspect-square' :
                      media.previewUrls.length === 3 && index === 2 ? 'aspect-[2/1]' :
                        media.previewUrls.length === 4 && index === 3 ? 'aspect-[2/1]' :
                          'aspect-square'
                  }`}>
                  {media.files[index]?.type.startsWith("video/") ? (
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors duration-200"
          >
            <Image className="w-5 h-5" />
            <span className="text-sm font-medium">Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors duration-200"
          >
            <Video className="w-5 h-5" />
            <span className="text-sm font-medium">Video</span>
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors duration-200">
                <Tag className="w-5 h-5" />
                <span className="text-sm font-medium">Category</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-md">
              <ScrollArea className="h-48">
                <div className="grid grid-cols-1 gap-2 p-2">
                  {postTags.map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => handleCategorySelect(tag.value)}
                      className={`flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 ${selectedPostTag === tag.value
                          ? "bg-pink-100 dark:bg-gray-600 text-pink-600 dark:text-pink-400"
                          : "text-gray-700 dark:text-gray-300"
                        }`}
                    >
                      <Tag className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {tag.label}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <button
            onClick={() => setIsTagModalOpen(true)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-pink-500 transition-colors duration-200"
          >
            <AtSign className="w-5 h-5" />
            <span className="text-sm font-medium">Tag</span>
          </button>
        </div>
        {media.files.length > 0 && (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
            {media.files.length}/4 files
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Tag Modal - With tabs for Users, Groups, Products */}
      <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Tag People or Products
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search by name or username..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="mb-3 w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <Tabs
            defaultValue="users"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-3 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
              <TabsTrigger
                value="users"
                className="rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white transition-colors duration-200 py-1.5 text-sm font-medium"
              >
                <User className="w-4 h-4 mr-1" /> Users
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="rounded-md data-[state=active]:bg-pink-500 data-[state=active]:text-white transition-colors duration-200 py-1.5 text-sm font-medium"
              >
                <ShoppingBag className="w-4 h-4 mr-1" /> Products
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(80vh-250px)] pr-3">
              <TabsContent value="users">
                {isLoadingTags ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
                    Loading...
                  </p>
                ) : taggableEntities.users.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                    No users found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {taggableEntities.users.map((entity) => (
                      <button
                        key={`${entity.type}-${entity.id}`}
                        onClick={() => handleUserSelect(entity.id, entity.username || '')}
                        className={`flex items-center space-x-3 p-2 w-full text-left rounded-md transition-colors duration-200 ${selectedUsers.includes(entity.id)
                            ? "bg-pink-100 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800"
                            : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-pink-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                            {entity.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-base font-medium text-gray-900 dark:text-white truncate">
                            {entity.name}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {entity.username}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {selectedUsers.includes(entity.id) && (
                            <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                              Selected
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            User
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="products">
                {isLoadingTags ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
                    Loading...
                  </p>
                ) : taggableEntities.products.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                    No products found
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {taggableEntities.products.map((entity) => (
                      <ProductTagCard
                        key={`${entity.type}-${entity.id}`}
                        product={{
                          id: entity.id,
                          name: entity.name,
                          price: entity.price || 0,
                          image_url: entity.image_url ?? null,
                          vendor_id: entity.vendor_id || '',
                        }}
                        onSelect={() => handleProductSelect(entity.id)}
                        isSelected={selectedProducts.includes(entity.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstagramStylePostCreator;
