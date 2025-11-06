
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
    is_private: group?.is_private || false,
    auto_approve_requests: group?.auto_approve_requests || false,
    max_members: group?.max_members || 50
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('groups')
        .update(data)
        .eq('id', group.id);
      
      if (error) throw error;
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
        description: error.message,
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
            <Label htmlFor="max_members">Maximum Members</Label>
            <Input
              id="max_members"
              type="number"
              min="1"
              max="500"
              value={formData.max_members}
              onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="is_private">Private Group</Label>
            <Switch
              id="is_private"
              checked={formData.is_private}
              onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
            />
          </div>
          
          {!formData.is_private && (
            <div className="flex items-center justify-between">
              <Label htmlFor="auto_approve">Auto-approve Join Requests</Label>
              <Switch
                id="auto_approve"
                checked={formData.auto_approve_requests}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_approve_requests: checked })}
              />
            </div>
          )}
          
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
