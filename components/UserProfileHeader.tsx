'use client';

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, Calendar, UserPlus, UserMinus, Edit, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import FollowersModal from "./FollowersModal";
import EditProfileModal from "./EditProfileModal";
import { apiClient } from "@/lib/api-client";

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

  const { data: followStatus } = useQuery({
    queryKey: ['is-following', profileUserId],
    queryFn: async () => {
      if (!user || isOwnProfile) return { isFollowing: false };
      const { data } = await apiClient.get(`/users/${profileUserId}/follow/status`);
      return data;
    },
    enabled: !!user && !isOwnProfile,
  });

  const isFollowing = followStatus?.isFollowing || false;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      if (isFollowing) {
        await apiClient.delete(`/users/${profileUserId}/follow`);
      } else {
        await apiClient.post(`/users/${profileUserId}/follow`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing 
          ? `You unfollowed ${profile?.fullName || 'this user'}` 
          : `You are now following ${profile?.fullName || 'this user'}`,
      });
    },
    onError: (error: any) => {
      console.error('Follow mutation error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
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
              {profile?.avatarUrl ? (
                <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg">
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                    {profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-lg rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                  {profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile?.fullName || 'Unknown User'}
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
                  Joined {new Date(profile?.createdAt).toLocaleDateString('en-US', { 
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
