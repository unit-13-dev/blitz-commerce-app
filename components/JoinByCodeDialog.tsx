'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, Users } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface JoinByCodeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinByCodeDialog = ({ isOpen, onOpenChange }: JoinByCodeDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const joinGroupMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error("Please log in to join groups");
      
      // First, find the group by access code
      const { data: groupsData } = await apiClient.get('/groups');
      const group = groupsData?.groups?.find((g: any) => g.accessCode === code.toUpperCase());
      
      if (!group) {
        throw new Error("Invalid access code");
      }

      // Join the group
      await apiClient.post(`/groups/${group.id}/join`, { accessCode: code.toUpperCase() });
      
      return { success: true, group_name: group.name, groupId: group.id };
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `You've joined "${data.group_name}"`,
      });
      setAccessCode("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group", data.groupId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to join group",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an access code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    joinGroupMutation.mutate(accessCode.trim().toUpperCase(), {
      onSettled: () => setIsSubmitting(false),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-pink-500" />
            Join Private Group
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="access-code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Access Code
            </label>
            <Input
              id="access-code"
              type="text"
              placeholder="Enter 8-digit code (e.g., ABC12345)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="text-center text-lg font-mono tracking-widest"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter the 8-digit access code shared by the group creator
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !accessCode.trim()}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              {isSubmitting ? "Joining..." : "Join Group"}
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">How it works:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Get the access code from the group creator</li>
                <li>• Enter the 8-digit code above</li>
                <li>• You'll be added to the private group</li>
                <li>• The group will appear in your profile</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinByCodeDialog; 