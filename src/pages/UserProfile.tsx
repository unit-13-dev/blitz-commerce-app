import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  FileText,
  BarChart3,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Edit,
  Camera,
  Shield,
  Users,
  ShoppingCart,
  Calendar,
  Building,
  Mail,
  Phone,
  ChevronDown,
  Globe,
  MapPin,
  Menu,
  X,
  TrendingUp,
  Lock,
  Key,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import KYCForm from "@/components/KYCForm";
import ProductForm from "@/components/ProductForm";
import VendorProductCard from "@/components/VendorProductCard";
import ImportProductsModal from "@/components/ImportProductsModal";
import BulkDiscountModal from "@/components/BulkDiscountModal";
import JoinByCodeDialog from "@/components/JoinByCodeDialog";
import CreateGroupModal from "@/components/CreateGroupModal";
import GroupOrderCard from "@/components/GroupOrderCard";
import { Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import { Textarea } from "@/components/ui/textarea";
import PostCard from "@/components/PostCard";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("posts");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showJoinByCodeDialog, setShowJoinByCodeDialog] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    bio: "",
    website: "",
    location: "",
    avatar_url: "",
  });
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [debouncedGroupSearchTerm, setDebouncedGroupSearchTerm] = useState("");

  // Debounced search effect for groups
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedGroupSearchTerm(groupSearchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [groupSearchTerm]);

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false);
  const [productFilter, setProductFilter] = useState<
    "all" | "with-tiers" | "without-tiers"
  >("all");
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false);

  const isOwnProfile = userId === user?.id || !userId;
  const profileUserId = userId || user?.id || "";
  const isAdmin = user?.role === "admin";

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileUserId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileUserId,
  });

  const isVendor = profile?.role === "vendor";
  const isCurrentUserVendor = currentUserProfile?.role === "vendor";

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        website: profile.website || "",
        location: profile.location || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  // Clear vendor-only data from cart/wishlist if user becomes vendor
  useEffect(() => {
    if (isCurrentUserVendor && isOwnProfile) {
      const clearVendorData = async () => {
        try {
          await supabase.from("cart_items").delete().eq("user_id", user?.id);
          await supabase.from("wishlist").delete().eq("user_id", user?.id);
        } catch (error) {
          console.error("Error clearing vendor data:", error);
        }
      };
      clearVendorData();
    }
  }, [isCurrentUserVendor, isOwnProfile, user?.id]);

  // Close mobile menu when section changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeSection]);

  // Fetch KYC data for vendors (only active records)
  const { data: kycData } = useQuery({
    queryKey: ["kyc", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_kyc')
        .select('*')
        .eq('vendor_id', profile?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.id && isVendor,
  });

  // Fetch vendor stats
  const { data: vendorStats } = useQuery({
    queryKey: ["vendor-stats", profile?.id],
    queryFn: async () => {
      if (!isVendor) return null;

      // Total products
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", profile?.id);

      // Active products
      const { count: activeProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", profile?.id)
        .eq("is_active", true);

      // Products sold (from order_items via products)
      const { data: soldProductsData } = await supabase
        .from("order_items")
        .select(
          `
          quantity,
          unit_price,
          total_price,
          orders!inner(created_at),
          products!inner(vendor_id)
        `
        )
        .eq("products.vendor_id", profile?.id);

      const totalSold = soldProductsData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalRevenue = soldProductsData?.reduce((sum, item) => sum + item.total_price, 0) || 0;

      // Sales last month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const lastMonthSales =
        soldProductsData
          ?.filter((item) => new Date(item.orders.created_at) >= lastMonth)
          .reduce((sum, item) => sum + item.quantity * item.price, 0) || 0;

      return {
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        totalSold,
        totalRevenue,
        lastMonthSales,
      };
    },
    enabled: !!profile?.id && isVendor,
  });

  // Follow functionality
  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, profileUserId],
    queryFn: async () => {
      if (!user?.id || !profileUserId || isOwnProfile) return false;
      
      const { data, error } = await supabase.rpc('is_following', {
        follower_uuid: user.id,
        following_uuid: profileUserId
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!profileUserId && !isOwnProfile,
  });

  const { data: followersCount = 0 } = useQuery({
    queryKey: ["followers-count", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return 0;
      
      const { data, error } = await supabase.rpc('get_follower_count', {
        user_uuid: profileUserId
      });
      
      if (error) throw error;
      return data || 0;
    },
    enabled: !!profileUserId,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following-count", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return 0;
      
      const { data, error } = await supabase.rpc('get_following_count', {
        user_uuid: profileUserId
      });
      
      if (error) throw error;
      return data || 0;
    },
    enabled: !!profileUserId,
  });

  // Follow/Unfollow mutations
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profileUserId) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("user_follows")
        .insert({
          follower_id: user.id,
          following_id: profileUserId
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["followers-count", profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["following-count", user?.id] });
      toast({ title: "Followed successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error following user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profileUserId) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileUserId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", user?.id, profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["followers-count", profileUserId] });
      queryClient.invalidateQueries({ queryKey: ["following-count", user?.id] });
      toast({ title: "Unfollowed successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error unfollowing user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFollowToggle = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/users/${profileUserId}`;
    if (navigator.share) {
      navigator.share({
        title: `${profile?.full_name || profile?.email}'s Profile`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast({ title: "Profile link copied to clipboard!" });
    }
  };

  // Fetch user's posts with privacy filtering
  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", profile?.id, user?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          ),
          post_likes (user_id),
          comment_count: post_comments (count),
          post_images (
            image_url,
            display_order
          ),
          post_tag_mappings (
            post_tags (
              name
            )
          ),
          post_tagged_products (
            products (
              id,
              name,
              price,
              image_url
            )
          )
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedPosts = data.map((post) => ({
        ...post,
        user: {
          id: post.user_id,
          name: post.profiles?.full_name || post.profiles?.email?.split("@")[0] || "Unknown User",
          avatar: post.profiles?.avatar_url || null,
          username: `@${post.profiles?.email?.split("@")[0] || "user"}`,
        },
        liked: user && Array.isArray(post.post_likes) && post.post_likes.some((like) => like.user_id === user?.id) || false,
        likes_count: post.post_likes?.length || 0,
        comments_count: typeof post.comment_count === 'number' ? post.comment_count : 0,
        images: post.post_images || [],
        post_tags: post.post_tag_mappings?.map((mapping: any) => mapping.post_tags) || [],
        tagged_products: post.post_tagged_products?.map((mapping: any) => ({
          product_id: mapping.products.id,
          product_name: mapping.products.name,
          product_price: mapping.products.price,
          product_image: mapping.products.image_url,
        })) || [],
        rating: post.rating,
      }));

      // Apply privacy filtering based on who is viewing the profile
      const filteredPosts = await Promise.all(
        transformedPosts.map(async (post) => {
          // If viewing own profile, show all posts (including drafts)
          if (isOwnProfile) {
            return post;
          }

          // If not logged in, only show public posts
          if (!user) {
            return post.privacy === 'public' && post.status === 'published' ? post : null;
          }

          // If viewing someone else's profile, apply privacy rules
          switch (post.privacy) {
            case 'public':
              return post.status === 'published' ? post : null;
            case 'following':
              // Check if current user follows the profile owner
              try {
                const { data: followData } = await supabase
                  .from('user_follows')
                  .select('id')
                  .eq('follower_id', user.id)
                  .eq('following_id', profile.id)
                  .single();
                
                return followData && post.status === 'published' ? post : null;
              } catch (error) {
                return null;
              }
            case 'draft':
              // Draft posts should not be visible to others
              return null;
            default:
              return post.status === 'published' ? post : null;
          }
        })
      );

      return filteredPosts.filter(Boolean);
    },
    enabled: !!profile?.id,
  });

  // Fetch vendor's products
  const { data: products = [] } = useQuery({
    queryKey: ["vendor-products", profile?.id],
    queryFn: async () => {
      if (!isVendor) return [];

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", profile?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && isVendor,
  });

  // Fetch tier information for products
  const { data: productTiers = [] } = useQuery({
    queryKey: ["product-tiers-bulk", profile?.id],
    queryFn: async () => {
      if (!isVendor || products.length === 0) return [];

      const productIds = products.map((p) => p.id);
      const { data, error } = await supabase
        .from("product_discount_tiers")
        .select("product_id, discount_percentage")
        .in("product_id", productIds);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && isVendor && products.length > 0,
  });

  // Fetch user's groups
  const { data: userGroups = [] } = useQuery({
    queryKey: ["user-groups", profile?.id],
    queryFn: async (): Promise<any[]> => {
      if (!profile?.id) return [];

      console.log("Fetching groups for user:", profile.id);

      // First get the group IDs that the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", profile.id);

      if (memberError) {
        console.error("Error fetching group memberships:", memberError);
        throw memberError;
      }

      console.log("Group memberships:", memberData);

      if (!memberData || memberData.length === 0) {
        console.log("No group memberships found");
        return [];
      }

      // Extract group IDs
      const groupIds = memberData.map(item => item.group_id);

      // Then fetch the groups with basic data (no product relationship)
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          is_private,
          access_code,
          created_at,
          product_id,
          order_id,
          finalization_deadline,
          admin_finalized_at
        `)
        .in("id", groupIds)
        .order("created_at", { ascending: false });

      if (groupsError) {
        console.error("Error fetching groups:", groupsError);
        throw groupsError;
      }

      console.log("Groups data:", groupsData);

      // If we have groups, fetch their products separately
      if (groupsData && groupsData.length > 0) {
        const productIds = groupsData.map(group => group.product_id).filter(Boolean);
        
        if (productIds.length > 0) {
          // Fetch products with their first image from product_images table
          const productsWithImages = await Promise.all(
            productIds.map(async (productId) => {
              try {
                // Get product basic info
                const { data: productData, error: productError } = await supabase
                  .from("products")
                  .select("id, name")
                  .eq("id", productId)
                  .single();

                if (productError) {
                  console.error("Error fetching product:", productId, productError);
                  return null;
                }

                // Get first image from product_images table
                const { data: imagesData, error: imagesError } = await supabase
                  .from("product_images")
                  .select("image_url")
                  .eq("product_id", productId)
                  .order("display_order", { ascending: true })
                  .limit(1);

                if (imagesError) {
                  console.error("Error fetching images for product:", productId, imagesError);
                }

                const imageUrl = imagesData?.[0]?.image_url || null;
                console.log(`Product ${productData.name} (${productId}): image_url = ${imageUrl}`);

                return {
                  ...productData,
                  image_url: imageUrl,
                };
              } catch (error) {
                console.error("Error processing product:", productId, error);
                return null;
              }
            })
          );

          // Filter out null products and create map
          const validProducts = productsWithImages.filter(p => p !== null);
          const productsMap = new Map(validProducts.map(p => [p.id, p]));
          
          const groupsWithProducts: any[] = groupsData.map(group => ({
            ...group,
            product: productsMap.get(group.product_id) || null
          }));
          
          console.log("Groups with products:", groupsWithProducts);
          return groupsWithProducts;
        }
      }

      return groupsData as any[] || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch user's orders (only for own profile and non-vendors)
  const { data: orders = [] } = useQuery({
    queryKey: ["user-orders", profile?.id],
    queryFn: async () => {
      if (!profile?.id || isVendor || !isOwnProfile) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (
            *,
            product:products (
              name,
              image_url
            )
          )
        `
        )
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !isVendor && isOwnProfile,
  });

  // Fetch user's cart (only for own profile and non-vendors)
  const { data: cartItems = [] } = useQuery({
    queryKey: ["user-cart", profile?.id],
    queryFn: async () => {
      if (!profile?.id || isVendor || !isOwnProfile) return [];

      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
          *,
          product:products (
            name,
            image_url,
            price
          )
        `
        )
        .eq("user_id", profile.id);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !isVendor && isOwnProfile,
  });



  // Sidebar navigation items
  const getUserNavItems = () => {
    // If viewing own profile, show all sections
    if (isOwnProfile) {
      return [
        { id: "posts", label: "Posts", icon: FileText },
        { id: "groups", label: "Groups", icon: Users },
        { id: "orders", label: "Orders", icon: ShoppingCart },
        { id: "cart", label: "Cart", icon: ShoppingCart },
      ];
    }
    
    // If viewing other user's profile, show only posts
    return [
      { id: "posts", label: "Posts", icon: FileText },
    ];
  };

  const getVendorNavItems = () => {
    // If viewing own profile, show all sections
    if (isOwnProfile) {
      return [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "products", label: "Products", icon: Package },
        { id: "posts", label: "Posts", icon: FileText },
        { id: "groups", label: "Groups", icon: Users },
        { id: "orders", label: "Orders", icon: ShoppingCart },
        { id: "kyc", label: "KYC Status", icon: Shield },
        { id: "company", label: "Company Info", icon: Building },
      ];
    }
    
    // If viewing other vendor's profile, show posts and products
    return [
      { id: "posts", label: "Posts", icon: FileText },
      { id: "products", label: "Products", icon: Package },
    ];
  };

  const navItems = isVendor ? getVendorNavItems() : getUserNavItems();

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { error } = await supabase
        .from("profiles")
        .update(updatedData)
        .eq("id", profile?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully!" });
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate(profileForm);
  };

  // Bulk selection handlers
  const handleProductSelection = (productId: string, isSelected: boolean) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const filteredProducts = getFilteredProducts();
    const allProductIds = filteredProducts.map((p) => p.id);
    setSelectedProducts(new Set(allProductIds));
  };

  const handleDeselectAll = () => {
    setSelectedProducts(new Set());
  };

  const toggleBulkSelectionMode = () => {
    setIsBulkSelectionMode(!isBulkSelectionMode);
    setSelectedProducts(new Set());
  };

  // Get tier info for a product
  const getProductTierInfo = (productId: string) => {
    const tiers = productTiers.filter((t) => t.product_id === productId);
    const hasTiers = tiers.length > 0;
    const maxDiscount =
      tiers.length > 0
        ? Math.max(...tiers.map((t) => t.discount_percentage))
        : 0;
    return { hasTieredDiscount: hasTiers, maxDiscount };
  };

  // Filter products based on current filter
  const getFilteredProducts = () => {
    if (productFilter === "all") return products;

    return products.filter((product) => {
      const { hasTieredDiscount } = getProductTierInfo(product.id);
      if (productFilter === "with-tiers") return hasTieredDiscount;
      if (productFilter === "without-tiers") return !hasTieredDiscount;
      return true;
    });
  };

  // Helper to determine KYC status
  const getKYCStatus = () => {
    if (!isVendor || !isOwnProfile) return { status: 'not_vendor' };
    if (!kycData) return { status: 'none' };
    if (kycData.status === 'pending') return { status: 'pending' };
    if (kycData.status === 'rejected') return { status: 'rejected', reason: kycData.rejection_reason };
    if (kycData.status === 'approved') return { status: 'approved' };
    return { status: 'unknown' };
  };

  // KYC status flags
  const kycStatus = getKYCStatus();
  const isKYCApproved = kycStatus.status === 'approved';
  const isKYCPending = kycStatus.status === 'pending';
  const isKYCRejected = kycStatus.status === 'rejected';
  const hasNoKYC = kycStatus.status === 'none';

  // Updated KYC status banner
  const KYCStatusBanner = () => {
    if (!isVendor || !isOwnProfile) return null;

    if (!kycData) {
    return (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Please complete your KYC verification to start selling products.
              </span>
              <Button
                onClick={() => setShowKYCForm(true)}
                size="sm"
                className="self-start sm:self-auto"
              >
                Complete KYC
              </Button>
              </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (kycData.status === 'pending') {
      return (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your KYC verification is pending approval. We'll notify you once
            it's processed.
          </AlertDescription>
        </Alert>
      );
    }
    if (isKYCRejected) {
      return (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Your KYC was rejected. Reason: <span className="font-semibold">{kycStatus.reason || 'No reason provided.'}</span></span>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  // Render different sections
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorStats?.totalProducts || 0}
          </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {vendorStats?.activeProducts || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendorStats?.totalSold.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{vendorStats?.totalRevenue.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Last Month Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-pink-600">
            ₹{vendorStats?.lastMonthSales.toLocaleString() || 0}
          </div>
        </CardContent>
      </Card>
      </div>
    );

  const renderPosts = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Posts</h3>
        {isOwnProfile && (
          <Button onClick={() => navigate("/")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        )}
      </div>
      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No posts yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showUserInfo={true} // Show user info in profile section
            />
          ))}
        </div>
      )}
    </div>
  );

  // Enhanced responsive renderProducts function
  const renderProducts = () => {
    const isKYCApproved = kycData?.status === 'approved';
    const isKYCPending = kycData?.status === 'pending';
    const isKYCRejected = kycData?.status === 'rejected';
    const hasNoKYC = kycStatus.status === 'none';

    // Helper function to render KYC status banner
    const renderKYCBanner = () => {
      if (hasNoKYC) {
    return (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  Complete your KYC verification to start selling products on
                  the marketplace.
                </span>
                <Button
                  onClick={() => setShowKYCForm(true)}
                  size="sm"
                  className="self-start sm:self-auto"
                >
                  {hasNoKYC ? "Initiate KYC" : "Resubmit KYC"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      }

      if (isKYCPending) {
        return (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your KYC verification is pending approval. You'll be able to add
              products once approved.
            </AlertDescription>
          </Alert>
        );
      }

      if (isKYCRejected) {
        return (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Your KYC was rejected. Reason: <span className="font-semibold">{kycStatus.reason || 'No reason provided.'}</span></span>
          <Button
                  onClick={() => setShowKYCForm(true)}
                  size="sm"
            variant="outline"
                  className="self-start sm:self-auto"
          >
                  Resubmit KYC
          </Button>
      </div>
            </AlertDescription>
          </Alert>
    );
  }

      return null;
    };

    const filteredProducts = getFilteredProducts();

  return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Header with actions - Enhanced Mobile */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold">Products</h3>
            
            {isOwnProfile && isKYCApproved && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center gap-2 text-sm sm:text-base"
                  size="sm"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                  <span className="sm:hidden">Import</span>
                </Button>
                {products.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={toggleBulkSelectionMode}
                    className={`flex items-center justify-center gap-2 text-sm sm:text-base ${
                      isBulkSelectionMode
                        ? "bg-pink-50 border-pink-300 text-pink-700"
                        : ""
                    }`}
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden lg:inline">
                      {isBulkSelectionMode ? "Exit Selection" : "Add Bulk Tiered Discount"}
                    </span>
                    <span className="lg:hidden">
                      {isBulkSelectionMode ? "Exit" : "Bulk Tiers"}
                    </span>
                  </Button>
                )}
                <Button 
                  onClick={() => setShowProductForm(true)}
                  className="text-sm sm:text-base"
                  size="sm"
      >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Add Product</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            )}
          </div>

          {/* Filters - Enhanced Mobile Layout */}
          {isOwnProfile && isKYCApproved && products.length > 0 && (
            <div className="flex flex-col gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Filter:</span>
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {["all", "with-tiers", "without-tiers"].map((filter) => (
                      <Button
                        key={filter}
                        variant={productFilter === filter ? "default" : "outline"}
                        size="sm"
                        onClick={() => setProductFilter(filter as any)}
                        className="text-xs whitespace-nowrap"
                      >
                        {filter === "all"
                          ? "All"
                          : filter === "with-tiers"
                          ? "With Tiers"
                          : "Without Tiers"}
                      </Button>
                    ))}
                  </div>
                </div>

                {isBulkSelectionMode && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto">
                    <span className="text-sm text-gray-600">
                      {selectedProducts.size} of {filteredProducts.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        All
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                        None
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Products Grid - Enhanced Responsive */}
        {(isKYCApproved || !isOwnProfile) && (
          <>
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 sm:py-12 lg:py-16">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 text-sm sm:text-base lg:text-lg">
                    {products.length === 0
                      ? "No products yet."
                      : "No products match the current filter."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {filteredProducts.map((product, index) => {
                  const tierInfo = getProductTierInfo(product.id);
                  return (
                    <VendorProductCard
                      key={product.id}
                      product={product}
                      isOwner={isOwnProfile}
                      index={index}
                      isSelectable={isBulkSelectionMode}
                      isSelected={selectedProducts.has(product.id)}
                      onSelectionChange={handleProductSelection}
                      hasTieredDiscount={tierInfo.hasTieredDiscount}
                      maxDiscount={tierInfo.maxDiscount}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderGroups = () => {
    // Filter groups based on search term
    const filteredGroups = userGroups?.filter((group) => {
      const searchLower = debouncedGroupSearchTerm.toLowerCase();
      return (
        group.name?.toLowerCase().includes(searchLower) ||
        group.description?.toLowerCase().includes(searchLower) ||
        group.product?.name?.toLowerCase().includes(searchLower)
      );
    }) || [];

    return (
      <div className="space-y-6">
        {/* Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900">
              Groups ({filteredGroups.length} of {userGroups?.length || 0})
            </h3>
            {userGroups?.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Latest First
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search groups by name, description, or product..."
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
              {groupSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGroupSearchTerm("");
                    setDebouncedGroupSearchTerm("");
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowJoinByCodeDialog(true)}
                className="flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Join by Code
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateGroupModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        {userGroups?.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Groups Yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Join existing groups or create your own to start group ordering with friends and family.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowJoinByCodeDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Join Private Group
                </Button>
                <Button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                >
                  <Plus className="w-4 h-4" />
                  Create Group
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredGroups.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="text-center py-12">
              <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Groups Found</h3>
              <p className="text-gray-500 mb-4">
                No groups match your search criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setGroupSearchTerm("");
                  setDebouncedGroupSearchTerm("");
                }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredGroups.map((group) => (
              <GroupOrderCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOrders = () => {
    if (isVendor && isOwnProfile) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Vendor Orders</h3>
            <Button onClick={() => navigate('/vendor/orders')}>
              <Package className="w-4 h-4 mr-2" />
              View All Orders
            </Button>
          </div>
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Manage all orders for your products</p>
              <Button onClick={() => navigate('/vendor/orders')}>
                Go to Orders Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Order History</h3>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                    <div>
                      <h4 className="font-medium">
                        Order #{order.id.slice(0, 8)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Status: {order.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date: {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">₹{order.total_amount}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.order_items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 bg-gray-50 rounded p-2"
                      >
                        <img
                          src={item.products?.image_url || "/placeholder.svg"}
                          alt={item.products?.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <span className="text-sm">
                          {item.products?.name} x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCart = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Shopping Cart</h3>
      {cartItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Cart is empty.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={item.product?.image_url || "/placeholder.svg"}
                    alt={item.product?.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.product?.name}</h4>
                    <p className="text-sm text-gray-600">
                      Quantity: {item.quantity}
                    </p>
                    <p className="text-lg font-bold">₹{item.product?.price}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderKYCStatus = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">KYC Verification Status</h3>
      {!kycData && !showKYCForm ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-orange-400 mb-4" />
            <h4 className="font-semibold mb-2">KYC Not Completed</h4>
            <p className="text-gray-600 mb-4">
              Complete your KYC verification to start selling
            </p>
            <Button onClick={() => setShowKYCForm(true)}>Complete KYC</Button>
          </CardContent>
        </Card>
      ) : showKYCForm ? (
        <Card>
          <CardContent className="py-8">
            <KYCForm
              isInline
              existingData={kycData}
              onClose={() => setShowKYCForm(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {kycData.status === "approved" ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : kycData.status === "pending" ? (
                <Clock className="w-8 h-8 text-blue-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
              <div>
                <h4 className="font-semibold">
                  {kycData.status === "approved"
                    ? "Verified"
                    : kycData.status === "pending"
                    ? "Pending"
                    : "Rejected"}
                </h4>
                <p className="text-sm text-gray-600">
                  Business Name: {kycData.business_name}
                </p>
                {kycData.version > 1 && (
                  <p className="text-xs text-gray-500">
                    Version {kycData.version} • Submission #{kycData.submission_count}
                  </p>
                )}
              </div>
              <Badge variant={kycData.status === 'approved' ? 'default' : kycData.status === 'pending' ? 'secondary' : 'destructive'}>
                {kycData.status}
              </Badge>
            </div>
            {kycData.status === "rejected" && (
              <div className="mt-4">
                <p className="text-sm text-red-600 mb-4">
                  Your KYC was rejected. Please resubmit with correct information.
                </p>
                <Button onClick={() => setShowKYCForm(true)} variant="outline">
                  Resubmit KYC
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCompanyInfo = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Company Information</h3>
      {!kycData ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              Complete KYC to view company information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Business Name
                </Label>
                <p className="font-semibold">{kycData.business_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Display Name
                </Label>
                <p className="font-semibold">{kycData.display_business_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Business Type
                </Label>
                <p className="font-semibold">{kycData.business_type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Registration Number
                </Label>
                <p className="font-semibold">
                  {kycData.business_registration_number}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-gray-600">
                  Business Address
                </Label>
                <p className="font-semibold">{kycData.business_address}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Contact Email
                </Label>
                <p className="font-semibold">{kycData.contact_email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Contact Phone
                </Label>
                <p className="font-semibold">{kycData.contact_phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "posts":
        return renderPosts();
      case "products":
        return renderProducts();
      case "groups":
        return renderGroups();
      case "orders":
        return renderOrders();
      case "cart":
        return renderCart();
      case "kyc":
        return renderKYCStatus();
      case "company":
        return renderCompanyInfo();
      default:
        return renderPosts();
    }
  };

  if (!profileUserId) {
    navigate("/auth");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            User not found
          </h1>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Main Content Container - Enhanced Responsive */}
      <div className="flex-1 container mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-6 lg:py-8 mt-16 sm:mt-20">
        <KYCStatusBanner />
        
        {/* Profile Header - Fully Responsive */}
        <Card className="mb-4 sm:mb-6 lg:mb-8">
          <CardContent className="p-3 sm:p-4 lg:p-6 xl:p-8">
            {/* Main Profile Info - Enhanced Mobile Layout */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-3 sm:gap-4 lg:gap-6">
              {/* Avatar - Responsive Sizing */}
              <div className="flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 mx-auto sm:mx-0 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                    {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Details - Enhanced Responsive Layout */}
              <div className="flex-1 space-y-2 sm:space-y-3 lg:space-y-4 text-center sm:text-left w-full sm:w-auto">
                {/* Name and Verification */}
                <div className="space-y-1 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-3">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 break-words">
                      {profile.full_name || profile.email}
                    </h1>
                    {isVendor && kycData?.status === "approved" && (
                      <div className="flex items-center justify-center sm:justify-start">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-500" />
                        <span className="text-xs sm:text-sm text-green-600 ml-1 font-medium">Verified</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Username and Role */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <p className="text-sm sm:text-base text-gray-600 break-all">
                      @{profile.email.split("@")[0]}
                    </p>
                    <Badge variant="outline" className="text-xs sm:text-sm capitalize w-fit mx-auto sm:mx-0">
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                {/* Stats - Enhanced Mobile Layout */}
                <div className="flex justify-center sm:justify-start gap-4 sm:gap-6 lg:gap-8 py-2">
                  <div className="text-center">
                    <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">
                      {posts.length}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                      Posts
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">
                      {followersCount}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                      Followers
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">
                      {followingCount}
                    </div>
                    <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                      Following
                    </div>
                  </div>
                </div>

                {/* Bio - Responsive Text */}
                {profile.bio && (
                  <p className="text-sm sm:text-base lg:text-lg text-gray-800 leading-relaxed max-w-2xl">
                    {profile.bio}
                  </p>
                )}

                {/* Additional Info - Enhanced Mobile Layout */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm lg:text-base text-gray-600">
                  {profile.location && (
                    <span className="flex items-center justify-center sm:justify-start gap-1">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{profile.location}</span>
                    </span>
                  )}
                  {profile.website && (
                    <span className="flex items-center justify-center sm:justify-start gap-1">
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700 truncate max-w-[200px]"
                      >
                        {profile.website}
                      </a>
                    </span>
                  )}
                  <span className="flex items-center justify-center sm:justify-start gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>
                      Joined{" "}
                      {new Date(profile.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Action Buttons - Enhanced Responsive */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0 mt-2 sm:mt-0">
                {isOwnProfile ? (
                  <Button
                    onClick={() => setEditingProfile(true)}
                    className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
                    size="sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button 
                      variant={isFollowing ? "outline" : "default"}
                      onClick={handleFollowToggle}
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                      className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
                      size="sm"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleShareProfile}
                      className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
                      size="sm"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Sidebar - Enhanced Responsive Grid */}
        {profile?.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
            {/* Mobile Navigation Toggle - Enhanced */}
            <div className="xl:hidden mb-3 sm:mb-4">
              <Button
                variant="outline"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-full flex items-center justify-between p-3 sm:p-4 text-sm sm:text-base"
              >
                <span className="flex items-center gap-2">
                  <Menu className="w-4 h-4" />
                  Navigation
                </span>
                {mobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Sidebar - Enhanced Responsive Design */}
            <div
              className={cn(
                "xl:col-span-1",
                mobileMenuOpen ? "block" : "hidden xl:block"
              )}
            >
              <Card className="h-full xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] overflow-hidden">
                <CardContent className="p-2 sm:p-3 lg:p-4 h-full flex flex-col">
                  <nav className="space-y-1 overflow-y-auto flex-1">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 lg:px-4 py-2 sm:py-3 rounded-lg text-left transition-all duration-200 text-sm sm:text-base hover:scale-[1.02]",
                          activeSection === item.id
                            ? "bg-gradient-to-r from-pink-100 to-pink-50 text-pink-700 border border-pink-200 shadow-sm"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {activeSection === item.id && (
                          <div className="w-2 h-2 bg-pink-500 rounded-full ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Content Area - Enhanced Responsive */}
            <div className="xl:col-span-4">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                {renderContent()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Dialog - Enhanced Mobile Responsive */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <Card className="w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm sm:text-base">Full Name</Label>
                <Input
                  id="full_name"
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm sm:text-base">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  className="text-sm sm:text-base resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm sm:text-base">Location</Label>
                <Input
                  id="location"
                  value={profileForm.location}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm sm:text-base">Website</Label>
                <Input
                  id="website"
                  value={profileForm.website}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  className="text-sm sm:text-base"
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button
                  onClick={handleProfileUpdate} 
                  className="flex-1 text-sm sm:text-base"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Action Button - Enhanced Responsive */}
      {selectedProducts.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          className="fixed bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-40 px-3"
        >
          <Button
            onClick={() => setShowBulkDiscountModal(true)}
            disabled={selectedProducts.size > 100}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 rounded-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg font-semibold min-w-[250px] sm:min-w-[280px] h-12 sm:h-14 max-w-[calc(100vw-24px)]"
          >
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">
              Add Tiers to {selectedProducts.size} Product
              {selectedProducts.size > 1 ? "s" : ""}
            </span>
            {selectedProducts.size > 100 && (
              <span className="ml-2 text-xs sm:text-sm opacity-75 hidden sm:inline">Max 100</span>
            )}
          </Button>
            </motion.div>
      )}

      {/* Other dialogs remain the same but ensure they're responsive */}
      {/* ... existing dialogs with responsive enhancements ... */}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ProductForm
              onClose={() => setShowProductForm(false)}
            />
          </div>
        </div>
      )}

      {/* Import Products Modal */}
      {showImportModal && (
        <ImportProductsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
          }}
        />
      )}

      {/* Bulk Discount Modal */}
      {showBulkDiscountModal && (
        <BulkDiscountModal
          selectedProductIds={Array.from(selectedProducts)}
          onClose={() => setShowBulkDiscountModal(false)}
          onSuccess={() => {
            setShowBulkDiscountModal(false);
            setSelectedProducts(new Set());
            setIsBulkSelectionMode(false);
            queryClient.invalidateQueries({ queryKey: ['product-tiers-bulk'] });
          }}
        />
      )}

      {/* Join by Code Dialog */}
      <JoinByCodeDialog
        isOpen={showJoinByCodeDialog}
        onOpenChange={setShowJoinByCodeDialog}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onOpenChange={setShowCreateGroupModal}
        onSuccess={() => {
          setShowCreateGroupModal(false);
          // Invalidate user groups query with the specific user ID
          queryClient.invalidateQueries({ queryKey: ["user-groups", profileUserId] });
          queryClient.invalidateQueries({ queryKey: ["user-groups"] });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
        }}
      />

      <Footer />
    </div>
  );
};

export default UserProfile;
