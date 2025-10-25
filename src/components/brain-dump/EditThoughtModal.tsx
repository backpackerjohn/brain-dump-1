import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThoughtWithCategories } from '@/types/thought.types';

interface EditThoughtModalProps {
  thought: ThoughtWithCategories | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (thoughtId: string, updates: { title: string; snippet: string | null }) => void;
  isSaving?: boolean;
}

export function EditThoughtModal({
  thought,
  isOpen,
  onClose,
  onSave,
  isSaving = false
}: EditThoughtModalProps) {
  const [title, setTitle] = useState('');
  const [snippet, setSnippet] = useState('');

  useEffect(() => {
    if (thought) {
      setTitle(thought.title);
      setSnippet(thought.snippet || '');
    }
  }, [thought]);

  const handleSave = () => {
    if (!thought) return;
    onSave(thought.id, {
      title: title.trim(),
      snippet: snippet.trim() || null
    });
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setSnippet('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Thought</DialogTitle>
          <DialogDescription>
            Edit the title and summary. Original content cannot be changed to preserve AI analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter thought title..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="snippet">Summary</Label>
            <Textarea
              id="snippet"
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              placeholder="Enter thought summary..."
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

