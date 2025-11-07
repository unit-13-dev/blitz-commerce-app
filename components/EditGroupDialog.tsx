'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EditGroupDialogProps {
  group: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditGroupDialog = ({ group, open, onOpenChange }: EditGroupDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    isPrivate: group?.isPrivate || false,
    memberLimit: group?.memberLimit || 50
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: responseData } = await apiClient.put(`/groups/${group.id}`, {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate,
        memberLimit: data.memberLimit,
      });
      return responseData.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      onOpenChange(false);
      toast({
        title: "Group Updated",
        description: "Your group has been updated successfully.",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroupMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="memberLimit">Maximum Members (0 for no limit)</Label>
            <Input
              id="memberLimit"
              type="number"
              min="0"
              max="500"
              value={formData.memberLimit}
              onChange={(e) => setFormData({ ...formData, memberLimit: parseInt(e.target.value) || 0 })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="isPrivate">Private Group</Label>
            <Switch
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={updateGroupMutation.isPending}
              className="flex-1"
            >
              {updateGroupMutation.isPending ? 'Updating...' : 'Update Group'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGroupDialog;

