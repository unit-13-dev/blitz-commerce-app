import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  title: string;
}

interface UserData {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  bio: string;
}

const FollowersModal = ({ isOpen, onClose, userId, type, title }: FollowersModalProps) => {
  const { user } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-list', userId, type],
    queryFn: async () => {
      let query;
      
      if (type === 'followers') {
        // Get followers
        query = supabase
          .from('user_follows')
          .select(`
            follower_id,
            profiles!user_follows_follower_id_fkey (
              id,
              full_name,
              email,
              avatar_url,
              bio
            )
          `)
          .eq('following_id', userId);
      } else {
        // Get following
        query = supabase
          .from('user_follows')
          .select(`
            following_id,
            profiles!user_follows_following_id_fkey (
              id,
              full_name,
              email,
              avatar_url,
              bio
            )
          `)
          .eq('follower_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to get user profiles
      return data?.map((item: any) => {
        const profile = type === 'followers' 
          ? item.profiles 
          : item.profiles;
        return profile;
      }).filter(Boolean) || [];
    },
    enabled: isOpen && !!userId,
  });

  const UserItem = ({ userProfile }: { userProfile: UserData }) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check if current user is following this user
    useQuery({
      queryKey: ['is-following-modal', userProfile.id],
      queryFn: async () => {
        if (!user || user.id === userProfile.id) return false;
        
        const { data } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userProfile.id)
          .single();
        
        const following = !!data;
        setIsFollowing(following);
        return following;
      },
      enabled: !!user && user.id !== userProfile.id,
    });

    const handleFollowToggle = async () => {
      if (!user || user.id === userProfile.id) return;
      
      setIsLoading(true);
      try {
        if (isFollowing) {
          // Unfollow
          await supabase
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userProfile.id);
        } else {
          // Follow
          await supabase
            .from('user_follows')
            .insert({
              follower_id: user.id,
              following_id: userProfile.id
            });
        }
        setIsFollowing(!isFollowing);
      } catch (error) {
        console.error('Error toggling follow:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={userProfile.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
              {userProfile.full_name?.charAt(0) || userProfile.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {userProfile.full_name || 'Unknown User'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              @{userProfile.email?.split('@')[0] || 'user'}
            </p>
            {userProfile.bio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                {userProfile.bio}
              </p>
            )}
          </div>
        </div>
        
        {user && user.id !== userProfile.id && (
          <Button
            onClick={handleFollowToggle}
            disabled={isLoading}
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            className={isFollowing ? "" : "bg-pink-500 hover:bg-pink-600"}
          >
            {isFollowing ? (
              <>
                <UserMinus className="w-4 h-4 mr-1" />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1" />
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
      <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No {type} yet
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((userProfile) => (
                <UserItem key={userProfile.id} userProfile={userProfile} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersModal;