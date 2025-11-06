import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Calendar, UserPlus, UserMinus, Edit, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FollowersModal from "./FollowersModal";
import EditProfileModal from "./EditProfileModal";

interface UserProfileHeaderProps {
  profileUserId: string;
  profile: any;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
}

const UserProfileHeader = ({ profileUserId, profile, isOwnProfile, onEditProfile }: UserProfileHeaderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'followers' | 'following';
    title: string;
  }>({
    isOpen: false,
    type: 'followers',
    title: ''
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Check if current user is following this profile
  const { data: isFollowing = false } = useQuery({
    queryKey: ['is-following', profileUserId],
    queryFn: async () => {
      if (!user || isOwnProfile) return false;
      
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileUserId)
        .single();
      
      return !!data;
    },
    enabled: !!user && !isOwnProfile,
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileUserId);
        
        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: profileUserId
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure counts update properly
      queryClient.invalidateQueries({ queryKey: ['is-following', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] }); // Also update current user's profile
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing 
          ? `You unfollowed ${profile?.full_name || 'this user'}` 
          : `You are now following ${profile?.full_name || 'this user'}`,
      });
    },
    onError: (error: any) => {
      console.error('Follow mutation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFollow = () => {
    followMutation.mutate();
  };

  const openFollowersModal = () => {
    setModalState({
      isOpen: true,
      type: 'followers',
      title: 'Followers'
    });
  };

  const openFollowingModal = () => {
    setModalState({
      isOpen: true,
      type: 'following',
      title: 'Following'
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleEditProfile = () => {
    if (onEditProfile) {
      onEditProfile();
    } else {
      setIsEditModalOpen(true);
    }
  };

  return (
    <>
      <div className="bg-transparent border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {profile?.avatar_url ? (
                <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                    {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile?.full_name || 'Unknown User'}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    @{profile?.email?.split('@')[0] || 'user'}
                  </p>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {profile?.role || 'user'}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <>
                      <Button onClick={handleEditProfile} variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleFollow}
                      disabled={followMutation.isPending}
                      variant={isFollowing ? "outline" : "default"}
                      size="sm"
                      className={isFollowing ? "" : "bg-pink-500 hover:bg-pink-600"}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-900 dark:text-white">
                    {profile?.posts_count || 0}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">Posts</div>
                </div>
                <button 
                  onClick={openFollowersModal}
                  className="text-center hover:bg-slate-500 hover:text-white cursor-pointer rounded-lg p-2 transition-colors duration-200"
                >
                  <div className="font-bold text-lg text-gray-900 dark:text-white hover:text-white">
                    {profile?.followers_count || 0}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 hover:text-white">Followers</div>
                </button>
                <button 
                  onClick={openFollowingModal}
                  className="text-center hover:bg-slate-500 hover:text-white cursor-pointer rounded-lg p-2 transition-colors duration-200"
                >
                  <div className="font-bold text-lg text-gray-900 dark:text-white hover:text-white">
                    {profile?.following_count || 0}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 hover:text-white">Following</div>
                </button>
              </div>

              {/* Bio and Details */}
              {profile?.bio && (
                <p className="text-gray-700 dark:text-gray-300 max-w-md">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
                {profile?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {profile.location}
                  </div>
                )}
                {profile?.website && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:underline"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        userId={profileUserId}
        type={modalState.type}
        title={modalState.title}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
      />
    </>
  );
};

export default UserProfileHeader;
