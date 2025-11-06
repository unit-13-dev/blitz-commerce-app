import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Clock,
  X,
  AlertCircle,
  UsersRound,
  Package,
  FileText,
  Trash2,
  Plus,
  Menu,
  Shield,
  BarChart3,
  Users,
  Eye,
  Download,
  ImageIcon,
  FileIcon,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { debounce } from "lodash";

type UserRole = "user" | "vendor" | "admin";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKYC, setSelectedKYC] = useState<any>(null);
  const [showKYCDetailModal, setShowKYCDetailModal] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedGroupForAction, setSelectedGroupForAction] =
    useState<any>(null);
  const [showGroupActionDialog, setShowGroupActionDialog] = useState(false);
  const [groupActionType, setGroupActionType] = useState<
    "warn" | "restrict" | "delete"
  >("warn");
  const [groupActionReason, setGroupActionReason] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(
    null
  );
  const [imageUrls, setImageUrls] = useState<{[key: string]: string}>({});
  const [showRejectionHistoryModal, setShowRejectionHistoryModal] = useState(false);
  const [selectedKYCHistory, setSelectedKYCHistory] = useState<any>(null);
  const [rejectionHistory, setRejectionHistory] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(userSearchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [userSearchTerm]);

  // Access control - only admins can access this dashboard
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600">
                  You don't have permission to access the admin dashboard. Only administrators can view this page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Close mobile menu when section changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeSection]);

  // Function to check if URL is a PDF
  const isPDF = (url: string): boolean => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().endsWith('pdf');
  };

  // Function to check if URL is an image
  const isImage = (url: string): boolean => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Function to get proper image URL from Supabase storage
  const getImageUrl = async (filePath: string): Promise<string> => {
    try {
      if (!filePath) return '';
      
      // If it's already a full URL, return it
      if (filePath.startsWith('http')) {
        return filePath;
      }
      
      // Get public URL from Supabase storage
      const { data } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return '';
    }
  };

  // Function to preload and cache image URLs
  const preloadImageUrls = async (kyc: any) => {
    const urls: {[key: string]: string} = {};
    
    if (kyc.gst_url) {
      urls.gst_url = await getImageUrl(kyc.gst_url);
    }
    
    if (kyc.aadhar_url) {
      urls.aadhar_url = await getImageUrl(kyc.aadhar_url);
    }
    
    if (kyc.pan_url) {
      urls.pan_url = await getImageUrl(kyc.pan_url);
    }
    
    setImageUrls(prev => ({
      ...prev,
      [kyc.id]: urls
    }));
  };

  // Sidebar navigation items
  const navItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "kyc", label: "KYC Requests", icon: Shield },
    { id: "users", label: "Users", icon: UsersRound },
    { id: "products", label: "Products", icon: Package },
    { id: "posts", label: "Posts", icon: FileText },
    { id: "groups", label: "Groups", icon: Users },
  ];

  // Fetch pending KYCs
  const { data: pendingKYCs } = useQuery({
    queryKey: ["pending-kycs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_kyc")
        .select(
          `
          *,
          vendor_profile:profiles!vendor_id (
            email, 
            full_name
          )
        `
        )
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      
      // Preload image URLs for all KYCs
      if (data) {
        data.forEach(kyc => {
          preloadImageUrls(kyc);
        });
      }
      
      return data;
    },
  });

  // Fetch all users
  const { data: users } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch all products
  const { data: products } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          vendor_profile:profiles!vendor_id (
            email,
            full_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Enhanced groups query for admins
  const { data: groups } = useQuery({
    queryKey: ["all-groups"],
    queryFn: async () => {
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;

      if (!groupsData || groupsData.length === 0) {
        return [];
      }

      const creatorIds = [...new Set(groupsData.map((g) => g.creator_id))];
      const productIds = [
        ...new Set(groupsData.map((g) => g.product_id).filter(Boolean)),
      ];
      const groupIds = groupsData.map((g) => g.id);

      const { data: creators } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", creatorIds);

      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      const { data: memberCounts } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);

      return groupsData.map((group) => {
        const creator = creators?.find((c) => c.id === group.creator_id);
        const product = products?.find((p) => p.id === group.product_id);
        const memberCount =
          memberCounts?.filter((m) => m.group_id === group.id).length || 0;

        return {
          ...group,
          creator_profile: creator,
          product: product,
          member_count: memberCount,
        };
      });
    },
  });

  // Fetch all posts
  const { data: posts } = useQuery({
    queryKey: ["all-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          user_profile:profiles!user_id (
            email,
            full_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!profile) throw new Error("Not authenticated");

      const { error } = await supabase.from("posts").insert({
        user_id: profile.id,
        content,
        post_type: "text",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-posts"] });
      setNewPostContent("");
      setShowCreatePost(false);
      toast({
        title: "Post Created",
        description: "Admin post has been created successfully",
      });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-posts"] });
      toast({
        title: "Post Deleted",
        description: "Post has been deleted successfully",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-groups"] });
      toast({
        title: "Group Deleted",
        description: "Group has been deleted successfully",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "User Role Updated",
        description: "User role has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating user role:", error);
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Approve KYC
  const approveKYCMutation = useMutation({
    mutationFn: async (kycId: string) => {
      const { error } = await supabase
        .from("vendor_kyc")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq("id", kycId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-kycs"] });
      toast({
        title: "KYC Approved",
        description: "Vendor can now start selling products",
      });
      setSelectedKYC(null);
      setShowKYCDetailModal(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve KYC",
        variant: "destructive",
      });
    },
  });

  // Reject KYC
  const rejectKYCMutation = useMutation({
    mutationFn: async ({
      kycId,
      reason,
    }: {
      kycId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from("vendor_kyc")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq("id", kycId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-kycs"] });
      toast({
        title: "KYC Rejected",
        description: "Vendor has been notified",
      });
      setSelectedKYC(null);
      setShowKYCDetailModal(false);
      setOpenRejectDialog(false);
      setRejectionReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject KYC",
        variant: "destructive",
      });
    },
  });

  // Update product status mutation
  const updateProductStatusMutation = useMutation({
    mutationFn: async ({
      productId,
      isActive,
    }: {
      productId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_active: isActive })
        .eq("id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-products"] });
      toast({
        title: "Product Updated",
        description: "Product status has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      });
    },
  });

  // Group action mutation for warnings, restrictions, and deletions
  const groupActionMutation = useMutation({
    mutationFn: async ({
      groupId,
      action,
      reason,
    }: {
      groupId: string;
      action: "warn" | "restrict" | "delete";
      reason: string;
    }) => {
      if (action === "delete") {
        await supabase.from("group_members").delete().eq("group_id", groupId);

        const { error } = await supabase
          .from("groups")
          .delete()
          .eq("id", groupId);

        if (error) throw error;
      } else if (action === "restrict") {
        const { error } = await supabase
          .from("groups")
          .update({
            is_private: true,
          })
          .eq("id", groupId);

        if (error) throw error;
      }

      console.log(
        `Admin action: ${action} on group ${groupId} - Reason: ${reason}`
      );
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["all-groups"] });
      setShowGroupActionDialog(false);
      setSelectedGroupForAction(null);
      setGroupActionReason("");

      const actionMessages = {
        warn: "Warning sent to group creator",
        restrict: "Group has been restricted",
        delete: "Group has been deleted",
      };

      toast({
        title: "Action Completed",
        description: actionMessages[action],
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to perform action on group",
        variant: "destructive",
      });
    },
  });

  const handleGroupAction = (
    group: any,
    action: "warn" | "restrict" | "delete"
  ) => {
    setSelectedGroupForAction(group);
    setGroupActionType(action);
    setShowGroupActionDialog(true);
  };

  const executeGroupAction = () => {
    if (selectedGroupForAction && groupActionReason.trim()) {
      groupActionMutation.mutate({
        groupId: selectedGroupForAction.id,
        action: groupActionType,
        reason: groupActionReason,
      });
    }
  };

  const handleKYCReview = (kyc: any) => {
    setSelectedKYC(kyc);
    setShowKYCDetailModal(true);
    // Preload images for the selected KYC
    preloadImageUrls(kyc);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      // If url is a path, get the proper URL first
      const fileUrl = await getImageUrl(url);
      
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Error",
        description: "Failed to download the file",
        variant: "destructive",
      });
    }
  };

  // Component to render document (image or PDF)
  const DocumentPreview = ({ url, type, onImageClick }: { 
    url: string; 
    type: 'gst' | 'aadhar' | 'pan'; 
    onImageClick: () => void;
  }) => {
    const fileUrl = imageUrls[selectedKYC?.id]?.[`${type}_url`] || url;
    const isImageFile = isImage(fileUrl);
    const isPDFFile = isPDF(fileUrl);

    if (isPDFFile) {
      return (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg border-2 border-gray-200">
          <div className="text-center">
            <FileIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 text-sm font-medium">PDF Document</p>
            <p className="text-gray-500 text-xs">Click download to view</p>
          </div>
        </div>
      );
    }

    if (isImageFile) {
      return (
        <div
          className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-pink-300 transition-colors"
          onClick={onImageClick}
        >
          <img
            src={fileUrl}
            alt={`${type.toUpperCase()} Document`}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <div class="text-center">
                      <ImageIcon class="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p class="text-gray-500 text-sm">Image not available</p>
                    </div>
                  </div>
                `;
              }
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
            <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      );
    }

    // Fallback for unknown file types
    return (
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg border-2 border-gray-200">
        <div className="text-center">
          <FileIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500 text-sm">Document available</p>
        </div>
      </div>
    );
  };

  // Render sections
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Platform Overview</h3>
        <Button
          onClick={() => setShowCreatePost(true)}
          className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <UsersRound className="w-5 h-5 mr-2" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{users?.length || 0}</p>
            <div className="text-sm text-gray-600 mt-2">
              <span className="mr-4">
                Users: {users?.filter((u) => u.role === "user").length || 0}
              </span>
              <span className="mr-4">
                Vendors: {users?.filter((u) => u.role === "vendor").length || 0}
              </span>
              <span>
                Admins: {users?.filter((u) => u.role === "admin").length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Package className="w-5 h-5 mr-2" />
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{products?.length || 0}</p>
            <div className="text-sm text-gray-600 mt-2">
              <span className="mr-4">
                Active: {products?.filter((p) => p.is_active).length || 0}
              </span>
              <span>
                Inactive: {products?.filter((p) => !p.is_active).length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileText className="w-5 h-5 mr-2" />
              Posts & Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(posts?.length || 0) + (groups?.length || 0)}
            </p>
            <div className="text-sm text-gray-600 mt-2">
              <span className="mr-4">Posts: {posts?.length || 0}</span>
              <span>Groups: {groups?.length || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="w-5 h-5 mr-2" />
              Pending KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingKYCs?.length || 0}</p>
            <p className="text-sm text-gray-600 mt-2">
              {pendingKYCs && pendingKYCs.length > 0
                ? `${pendingKYCs.length} verification${
                    pendingKYCs.length > 1 ? "s" : ""
                  } waiting for review`
                : "No pending verifications"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderKYC = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        KYC Verification Requests ({pendingKYCs?.length || 0})
      </h3>
      {pendingKYCs?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              No pending KYC verification requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingKYCs?.map((kyc) => (
            <Card key={kyc.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">
                      {kyc.vendor_profile?.full_name ||
                        kyc.vendor_profile?.email}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Business: {kyc.business_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Submitted:{" "}
                      {new Date(kyc.submitted_at!).toLocaleDateString()}
                    </p>
                    {kyc.version > 1 && (
                      <p className="text-xs text-blue-600 font-medium">
                        Resubmission #{kyc.version} (Total: {kyc.submission_count})
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* Show rejection history button only if there's a previous KYC */}
                    {kyc.previous_kyc_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewRejectionHistory(kyc)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <AlertCircle className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleKYCReview(kyc)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderUsers = () => {
    // Filter users based on search term
    const filteredUsers = users?.filter((user) => {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower)
      );
    }) || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            User Management ({filteredUsers.length} of {users?.length || 0} users)
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
              {userSearchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUserSearchTerm("");
                    setDebouncedSearchTerm("");
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Joined</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        {debouncedSearchTerm ? "No users found matching your search." : "No users found."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">{user.full_name || "N/A"}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <Select
                            value={user.role}
                            onValueChange={(role: UserRole) =>
                              updateUserRoleMutation.mutate({
                                userId: user.id,
                                role,
                              })
                            }
                            disabled={updateUserRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          {updateUserRoleMutation.isPending && (
                            <div className="text-xs text-gray-500 mt-1">Updating...</div>
                          )}
                        </td>
                        <td className="p-4">
                          {new Date(user.created_at!).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {user.id !== profile?.id && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderProducts = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Product Management ({products?.length || 0} products)
      </h3>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Vendor</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{product.name}</td>
                    <td className="p-4">
                      {product.vendor_profile?.full_name ||
                        product.vendor_profile?.email}
                    </td>
                    <td className="p-4">₹{product.price}</td>
                    <td className="p-4">
                      <Badge
                        variant={product.is_active ? "default" : "secondary"}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button
                        variant={product.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() =>
                          updateProductStatusMutation.mutate({
                            productId: product.id,
                            isActive: !product.is_active,
                          })
                        }
                      >
                        {product.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPosts = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Post Management ({posts?.length || 0} posts)
      </h3>
      {posts?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No posts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">
                        Post by {post.user_profile?.full_name}
                      </span>
                    </div>
                    <p className="text-gray-700">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePostMutation.mutate(post.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderGroups = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Group Management ({groups?.length || 0} groups)
      </h3>
      {groups?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No groups found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups?.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{group.name}</h4>
                      <Badge
                        variant={group.is_private ? "secondary" : "default"}
                      >
                        {group.is_private ? "Private" : "Public"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{group.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>
                        Creator:{" "}
                        {group.creator_profile?.full_name ||
                          group.creator_profile?.email}
                      </span>
                      <span>Product: {group.product?.name}</span>
                      <span>Members: {group.member_count}</span>
                      <span>
                        Created:{" "}
                        {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGroupAction(group, "warn")}
                      className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Warn
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGroupAction(group, "restrict")}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      Restrict
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleGroupAction(group, "delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "kyc":
        return renderKYC();
      case "users":
        return renderUsers();
      case "products":
        return renderProducts();
      case "posts":
        return renderPosts();
      case "groups":
        return renderGroups();
      default:
        return renderOverview();
    }
  };

  // Fetch rejection history for a specific KYC
  const fetchRejectionHistory = async (kycId: string) => {
    try {
      const history = [];
      let currentKycId = kycId;
      
      // Traverse the chain of previous KYCs
      while (currentKycId) {
        const { data: kycData, error } = await supabase
          .from('vendor_kyc')
          .select(`
            *,
            vendor_profile:profiles!vendor_id (
              email, 
              full_name
            )
          `)
          .eq('id', currentKycId)
          .single();
        
        if (error || !kycData) break;
        
        // Only add rejected KYCs to history (excluding the current pending one)
        if (kycData.status === 'rejected') {
          history.push(kycData);
        }
        
        currentKycId = kycData.previous_kyc_id;
      }
      
      setRejectionHistory(history);
      setShowRejectionHistoryModal(true);
    } catch (error) {
      console.error('Error fetching rejection history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rejection history",
        variant: "destructive",
      });
    }
  };

  const handleViewRejectionHistory = (kyc: any) => {
    setSelectedKYCHistory(kyc);
    fetchRejectionHistory(kyc.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Navigation and Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Navigation Menu */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-center"
            >
              <Menu className="w-4 h-4 mr-2" />
              Menu
            </Button>

            {mobileMenuOpen && (
              <div className="mt-4 bg-white rounded-lg shadow-sm border p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeSection === item.id
                            ? "bg-pink-50 text-pink-700 border border-pink-200"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeSection === item.id
                          ? "bg-pink-50 text-pink-700 border border-pink-200"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 lg:max-w-7xl">{renderContent()}</div>
        </div>
      </div>

      {/* Create Post Dialog */}
      <Sheet open={showCreatePost} onOpenChange={setShowCreatePost}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create Admin Post</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What would you like to share?"
              className="min-h-32"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => createPostMutation.mutate(newPostContent)}
                disabled={
                  createPostMutation.isPending || !newPostContent.trim()
                }
                className="social-button bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 flex-1"
              >
                {createPostMutation.isPending ? "Creating..." : "Create Post"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreatePost(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* KYC Detail Modal */}
      <Dialog open={showKYCDetailModal} onOpenChange={setShowKYCDetailModal}>
        <DialogContent className="max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pink-500" />
              KYC Verification Details
            </DialogTitle>
          </DialogHeader>

          {selectedKYC && (
            <div className="space-y-6">
              {/* Vendor Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Vendor Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Full Name
                      </Label>
                      <p className="text-sm">
                        {selectedKYC.vendor_profile?.full_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Email
                      </Label>
                      <p className="text-sm">
                        {selectedKYC.vendor_profile?.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Submitted At
                      </Label>
                      <p className="text-sm">
                        {new Date(selectedKYC.submitted_at!).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Business Name
                      </Label>
                      <p className="text-sm">{selectedKYC.business_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Business Address
                      </Label>
                      <p className="text-sm">{selectedKYC.business_address}</p>
                    </div>
                    {selectedKYC.gst_number && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          GST Number
                        </Label>
                        <p className="text-sm">{selectedKYC.gst_number}</p>
                      </div>
                    )}
                    {selectedKYC.aadhar_number && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Aadhar Number
                        </Label>
                        <p className="text-sm">{selectedKYC.aadhar_number}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Document Images */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Uploaded Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* GST Document */}
                  {selectedKYC.gst_url && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {isPDF(selectedKYC.gst_url) ? (
                            <FileIcon className="w-4 h-4" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                          GST Document
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <DocumentPreview
                          url={selectedKYC.gst_url}
                          type="gst"
                          onImageClick={async () => {
                            const url = await getImageUrl(selectedKYC.gst_url);
                            setSelectedImageModal(url);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              selectedKYC.gst_url,
                              isPDF(selectedKYC.gst_url) 
                                ? "gst-document.pdf" 
                                : "gst-document.jpg"
                            )
                          }
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {isPDF(selectedKYC.gst_url) 
                            ? "Download GST PDF" 
                            : "Download GST Document"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {selectedKYC.pan_url && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          {isPDF(selectedKYC.pan_url) ? (
                            <FileIcon className="w-4 h-4" />
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                          Pan Document
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <DocumentPreview
                          url={selectedKYC.pan_url}
                          type="pan"
                          onImageClick={async () => {
                            const url = await getImageUrl(selectedKYC.pan_url);
                            setSelectedImageModal(url);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              selectedKYC.pan_url,
                              isPDF(selectedKYC.pan_url) 
                                ? "pan-document.pdf" 
                                : "pan-document.jpg"
                            )
                          }
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {isPDF(selectedKYC.pan_url) 
                            ? "Download Pan PDF" 
                            : "Download Pan Document"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {!selectedKYC.gst_url && !selectedKYC.pan_url && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No documents uploaded</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setOpenRejectDialog(true)}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject Application
                </Button>
                <Button
                  onClick={() => approveKYCMutation.mutate(selectedKYC.id)}
                  disabled={approveKYCMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {approveKYCMutation.isPending
                    ? "Approving..."
                    : "Approve Application"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedImageModal}
        onOpenChange={() => setSelectedImageModal(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="relative">
            <img
              src={selectedImageModal || ""}
              alt="Document Preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <AlertDialog open={openRejectDialog} onOpenChange={setOpenRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject KYC Application</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejection. This will be visible to the
              vendor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Rejection reason..."
              className="min-h-24"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpenRejectDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                rejectKYCMutation.mutate({
                  kycId: selectedKYC.id,
                  reason: rejectionReason,
                })
              }
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason.trim() || rejectKYCMutation.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              {rejectKYCMutation.isPending
                ? "Rejecting..."
                : "Reject Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Action Dialog */}
      <AlertDialog
        open={showGroupActionDialog}
        onOpenChange={setShowGroupActionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {groupActionType === "delete"
                ? "Delete Group"
                : groupActionType === "restrict"
                ? "Restrict Group"
                : "Send Warning"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {groupActionType === "delete"
                ? "This will permanently delete the group and all associated data. This action cannot be undone."
                : groupActionType === "restrict"
                ? "This will make the group private and invite-only, preventing new members from joining freely."
                : "This will send a warning to the group creator about policy violations."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={groupActionReason}
              onChange={(e) => setGroupActionReason(e.target.value)}
              placeholder="Please provide a reason for this action..."
              className="min-h-24"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowGroupActionDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeGroupAction}
              className={
                groupActionType === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
              disabled={!groupActionReason.trim()}
            >
              {groupActionType === "delete"
                ? "Delete Group"
                : groupActionType === "restrict"
                ? "Restrict Group"
                : "Send Warning"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection History Modal */}
      <Dialog open={showRejectionHistoryModal} onOpenChange={setShowRejectionHistoryModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              KYC Rejection History
            </DialogTitle>
          </DialogHeader>

          {selectedKYCHistory && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800">Current Application</h4>
                <p className="text-sm text-blue-700">
                  Vendor: {selectedKYCHistory.vendor_profile?.full_name || selectedKYCHistory.vendor_profile?.email}
                </p>
                <p className="text-sm text-blue-700">
                  Business: {selectedKYCHistory.business_name}
                </p>
                <p className="text-sm text-blue-700">
                  Submitted: {new Date(selectedKYCHistory.submitted_at!).toLocaleString()}
                </p>
                <p className="text-sm text-blue-700">
                  Version: {selectedKYCHistory.version} | Total Submissions: {selectedKYCHistory.submission_count}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-800">Previous Rejections ({rejectionHistory.length})</h4>
                
                {rejectionHistory.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No rejection history found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {rejectionHistory.map((rejection, index) => (
                      <Card key={rejection.id} className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">
                                  Rejection #{rejectionHistory.length - index}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  Version {rejection.version}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">
                                    Rejected On
                                  </Label>
                                  <p className="text-sm">
                                    {new Date(rejection.reviewed_at!).toLocaleString()}
                                  </p>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium text-gray-600">
                                    Rejection Reason
                                  </Label>
                                  <p className="text-sm text-red-700 bg-red-50 p-2 rounded border border-red-200">
                                    {rejection.rejection_reason || 'No reason provided'}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-600">
                                      Business Name
                                    </Label>
                                    <p>{rejection.business_name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-600">
                                      GST Number
                                    </Label>
                                    <p>{rejection.gst_number || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-600">
                                      PAN Number
                                    </Label>
                                    <p>{rejection.pan_number || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-600">
                                      Phone Number
                                    </Label>
                                    <p>{rejection.phone_number || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;