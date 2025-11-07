'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  title: string;
}

interface UserData {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

const FollowersModal = ({ isOpen, onClose, userId, type, title }: FollowersModalProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const endpoint = type === 'followers' ? `/users/${userId}/followers` : `/users/${userId}/following`;

  const { data: response, isLoading } = useQuery({
    queryKey: ['users-list', userId, type],
    queryFn: async () => {
      const { data } = await apiClient.get(endpoint);
      return data;
    },
    enabled: isOpen && !!userId,
  });

  const users: UserData[] = type === 'followers' 
    ? (response?.followers || [])
    : (response?.following || []);

  const UserItem = ({ userProfile }: { userProfile: UserData }) => {
    const { data: followStatus } = useQuery({
      queryKey: ['is-following-modal', userProfile.id],
      queryFn: async () => {
        if (!user || user.id === userProfile.id) return { isFollowing: false };
        const { data } = await apiClient.get(`/users/${userProfile.id}/follow/status`);
        return data;
      },
      enabled: !!user && user.id !== userProfile.id && isOpen,
    });

    const isFollowing = followStatus?.isFollowing || false;

    const followMutation = useMutation({
      mutationFn: async () => {
        if (!user) throw new Error('Not authenticated');
        if (isFollowing) {
          await apiClient.delete(`/users/${userProfile.id}/follow`);
        } else {
          await apiClient.post(`/users/${userProfile.id}/follow`);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['is-following-modal', userProfile.id] });
        queryClient.invalidateQueries({ queryKey: ['users-list', userId, type] });
      },
    });

    const handleFollowToggle = () => {
      if (!user || user.id === userProfile.id) return;
      followMutation.mutate();
    };

    return (
      <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => {
            router.push(`/users/${userProfile.id}`);
            onClose();
          }}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={userProfile.avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
              {userProfile.fullName?.charAt(0) || userProfile.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {userProfile.fullName || 'Unknown User'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              @{userProfile.email?.split('@')[0] || 'user'}
            </p>
          </div>
        </div>
        {user && user.id !== userProfile.id && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            onClick={handleFollowToggle}
            disabled={followMutation.isPending}
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
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No {type} yet.</p>
            </div>
          ) : (
            users.map((userProfile) => (
              <UserItem key={userProfile.id} userProfile={userProfile} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersModal;
