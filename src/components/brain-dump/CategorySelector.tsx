import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Category } from '@/types/thought.types';

interface CategorySelectorProps {
  thoughtId: string;
  existingCategoryIds: string[];
  availableCategories: Category[];
  onAddCategory: (thoughtId: string, categoryName: string) => void;
}

export function CategorySelector({
  thoughtId,
  existingCategoryIds,
  availableCategories,
  onAddCategory
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Filter out already-added categories
  const selectableCategories = availableCategories.filter(
    cat => !existingCategoryIds.includes(cat.id)
  );

  // Check if search creates a new category
  const isNewCategory = searchValue.trim() && 
    !availableCategories.some(cat => 
      cat.name.toLowerCase() === searchValue.trim().toLowerCase()
    );

  const handleSelect = (categoryName: string) => {
    onAddCategory(thoughtId, categoryName);
    setSearchValue('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-muted"
        >
          <Plus className="h-3 w-3" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create category..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {isNewCategory ? (
              <div 
                className="p-2 text-sm cursor-pointer hover:bg-muted"
                onClick={() => handleSelect(searchValue.trim())}
              >
                <Plus className="inline mr-2 h-4 w-4" />
                Create "{searchValue.trim()}"
              </div>
            ) : (
              <div className="p-2 text-sm text-muted-foreground">
                No categories found
              </div>
            )}
          </CommandEmpty>
          <CommandGroup heading="Existing Categories">
            {selectableCategories.map((category) => (
              <CommandItem
                key={category.id}
                value={category.name}
                onSelect={() => handleSelect(category.name)}
              >
                <Check className="mr-2 h-4 w-4 opacity-0" />
                {category.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

