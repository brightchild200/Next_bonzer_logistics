import React from 'react';
import { Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type SearchModalProps<T> = {
  visible: boolean;
  title: string;
  search: string;
  setSearch: (text: string) => void;
  data: T[];
  keyExtractor: (item: T) => string;
  labelExtractor: (item: T) => string;
  subtitleExtractor?: (item: T) => string | undefined;
  onSelect: (item: T) => void;
  onClose: () => void;
  showAddButton?: boolean;
  addButtonText?: string;
  onAddNew?: () => void;
};

export function SearchModal<T>({
  visible,
  title,
  search,
  setSearch,
  data,
  keyExtractor,
  labelExtractor,
  subtitleExtractor,
  onSelect,
  onClose,
  showAddButton = false,
  addButtonText,
  onAddNew,
}: SearchModalProps<T>) {
  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9"
              autoFocus
            />
          </div>
          
          {showAddButton && (
            <button
              onClick={onAddNew}
              className="mt-3 flex w-full items-center gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {addButtonText}
            </button>
          )}
        </div>

        <ScrollArea className="max-h-[300px]">
          {data.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            <div className="flex flex-col">
              {data.map((item) => (
                <button
                  key={keyExtractor(item)}
                  onClick={() => onSelect(item)}
                  className="flex flex-col items-start px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-0"
                >
                  <span className="text-sm font-medium text-foreground">
                    {labelExtractor(item)}
                  </span>
                  {subtitleExtractor && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {subtitleExtractor(item)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
