
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Link, Key, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface InviteMembersDialogProps {
  groupId: string;
  groupName: string;
  accessCode: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteMembersDialog = ({ groupId, groupName, accessCode, isOpen, onOpenChange }: InviteMembersDialogProps) => {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Generate the group link
  const groupLink = `${window.location.origin}/groups/${groupId}`;
  
  // Generate the pre-written message
  const preWrittenMessage = `Hey! I've created a group order for "${groupName}" on GupShop. 

Join us to get better discounts! 

🔗 Group Link: ${groupLink}
🔑 Access Code: ${accessCode}

You can join using either the link or the access code. The more people join, the bigger the discount we get! 🎉`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(groupLink);
      setCopiedLink(true);
      toast({
        title: "Link Copied!",
        description: "Group link has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopiedCode(true);
      toast({
        title: "Access Code Copied!",
        description: "Access code has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(preWrittenMessage);
      setCopiedMessage(true);
      toast({
        title: "Message Copied!",
        description: "Pre-written message has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the message manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <Users className="w-5 h-5 text-pink-500" />
            Invite Members to {groupName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Link Section */}
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-pink-500" />
                  <Label className="text-sm font-medium text-gray-700">Group Link</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={groupLink}
                    readOnly
                    className="flex-1 text-sm bg-gray-50 border-gray-200"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyLink}
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    {copiedLink ? "Copied!" : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Code Section */}
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-pink-500" />
                  <Label className="text-sm font-medium text-gray-700">Access Code</Label>
                  <Badge variant="outline" className="text-xs border-pink-200 text-pink-600">8-digit code</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={accessCode}
                    readOnly
                    className="flex-1 text-sm font-mono bg-gray-50 border-gray-200"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyCode}
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    {copiedCode ? "Copied!" : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pre-written Message Section */}
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-500" />
                  <Label className="text-sm font-medium text-gray-700">Pre-written Message</Label>
                  <Badge variant="outline" className="text-xs border-pink-200 text-pink-600">Ready to share</Badge>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={preWrittenMessage}
                    readOnly
                    className="w-full h-32 p-3 text-sm border border-gray-200 rounded-md resize-none bg-gray-50 text-gray-700"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleCopyMessage}
                      className="bg-pink-500 hover:bg-pink-600 text-white"
                    >
                      {copiedMessage ? "Copied!" : <Copy className="w-4 h-4 mr-1" />}
                      {copiedMessage ? "Copied!" : "Copy Message"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="text-sm text-gray-600 space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="font-medium text-gray-700 mb-2">How to invite members:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Share the group link with friends</li>
              <li>Or share the access code for direct entry</li>
              <li>Copy the pre-written message for easy sharing</li>
              <li>Members can join using either method</li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-pink-200 text-pink-600 hover:bg-pink-50 hover:border-pink-300"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMembersDialog;
