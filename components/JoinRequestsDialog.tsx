'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, Mail, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface JoinRequestsDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinRequestsDialog = ({ groupId, groupName, open, onOpenChange }: JoinRequestsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/groups/${groupId}`);
      return data.group;
    },
    enabled: open && !!groupId,
  });

  const members = groupData?.members || [];

  const approveMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/groups/${groupId}/join`, {});
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast({
        title: "Member added",
        description: "User has been added to the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/groups/${groupId}/leave`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast({
        title: "Member removed",
        description: "User has been removed from the group",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {groupName} - Members
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No members yet</p>
            </div>
          ) : (
            members.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => {
                    router.push(`/users/${member.user.id}`);
                    onOpenChange(false);
                  }}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                      {member.user.fullName?.charAt(0) || member.user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.user.fullName || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {member.user.email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRequestsDialog;
