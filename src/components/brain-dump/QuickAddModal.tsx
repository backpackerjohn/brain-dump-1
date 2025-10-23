import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  isProcessing: boolean;
}

export function QuickAddModal({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}: QuickAddModalProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some thoughts before processing",
        variant: "destructive",
      });
      return;
    }

    if (content.trim().length < 3) {
      toast({
        title: "Content too short",
        description: "Please enter at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    onSubmit(content);
    setContent("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Brain Dump</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isProcessing || !content.trim()}>
              {isProcessing ? "Processing..." : "Process Thoughts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}