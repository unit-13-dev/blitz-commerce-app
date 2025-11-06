import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Settings as SettingsIcon, User, Moon, Sun, LogOut, 
  Save, AlertCircle, CheckCircle, Shield, Bell, Globe, Smartphone,
  Camera, Edit, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

interface ProfileFormData {
  full_name: string;
  bio: string;
  website: string;
  location: string;
  avatar_url: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '',
    bio: '',
    website: '',
    location: '',
    avatar_url: '',
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        website: profile.website || '',
        location: profile.location || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedData: ProfileFormData) => {
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully!" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating profile", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle profile update
  const handleProfileUpdate = () => {
    updateProfileMutation.mutate(profileForm);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({ title: "Signed out successfully" });
    } catch (error: any) {
      toast({ 
        title: "Error signing out", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setProfileForm(prev => ({ ...prev, avatar_url: publicUrl }));
      
      toast({ title: "Avatar uploaded successfully!" });
    } catch (error: any) {
      toast({
        title: "Error uploading avatar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account and preferences</p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-pink-600" />
                    <CardTitle className="text-gray-900 dark:text-white">Profile Information</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img
                      src={profileForm.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.full_name || user.email)}&size=80&background=ec4899&color=fff`}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-4 border-pink-200 dark:border-pink-700"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <label htmlFor="avatar-upload" className="cursor-pointer">
                          <Camera className="w-6 h-6 text-white" />
                          <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={isUploading}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profileForm.full_name || user.email}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                    <p className="text-sm text-pink-600 dark:text-pink-400 capitalize">{profile?.role}</p>
                  </div>
                </div>

                <Separator className="dark:bg-gray-700" />

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-gray-700 dark:text-gray-300">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-gray-700 dark:text-gray-300">Location</Label>
                    <Input
                      id="location"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website" className="text-gray-700 dark:text-gray-300">Website</Label>
                    <Input
                      id="website"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="https://example.com"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Tell us about yourself..."
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={updateProfileMutation.isPending}
                      className="bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Appearance Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-pink-600" />
                  ) : (
                    <Sun className="w-5 h-5 text-pink-600" />
                  )}
                  <CardTitle className="text-gray-900 dark:text-white">Appearance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Dark Mode</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Account Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-pink-600" />
                  <CardTitle className="text-gray-900 dark:text-white">Account</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Account Type</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{profile?.role}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    View Profile
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Verified</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-white dark:bg-gray-800 border-red-200 dark:border-red-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-red-700 dark:text-red-400">Account Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      These actions will affect your account access.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowLogoutDialog(true)}
                    className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white dark:bg-gray-800 shadow-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">Sign Out</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Are you sure you want to sign out?</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowLogoutDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="flex-1"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Settings; 