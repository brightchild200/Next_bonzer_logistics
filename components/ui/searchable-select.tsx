'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, ChevronDown, Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchableOption {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps<T extends SearchableOption> {
  value: T | null;
  onChange: (option: T | null) => void;
  options: T[];
  placeholder: string;
  title: string;
  searchPlaceholder?: string;
  showAddButton?: boolean;
  addButtonText?: string;
  onAddNew?: (searchText: string) => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
  loading?: boolean;
  onSearchChange?: (searchText: string) => void;
}

export function SearchableSelect<T extends SearchableOption>({
  value,
  onChange,
  options,
  placeholder,
  title,
  searchPlaceholder = 'Search...',
  showAddButton = false,
  addButtonText,
  onAddNew,
  disabled = false,
  leftIcon,
  className,
  loading = false,
  onSearchChange,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<T[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredOptions(options);
    setHighlightedIndex(-1);
  }, [options]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchText('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    onSearchChange?.(text);
    const filtered = options.filter((opt) =>
      opt.label.toLowerCase().includes(text.toLowerCase()) ||
      opt.subLabel?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredOptions(filtered);
    setHighlightedIndex(-1);
  }, [options, onSearchChange]);

  const handleSelect = (option: T) => {
    onChange(option);
    setSearchText(option.label);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    setSearchText('');
  };

  const handleAddNew = () => {
    const trimmed = searchText.trim();
    if (trimmed && onAddNew) {
      onAddNew(trimmed);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (showAddButton && searchText.trim() && onAddNew) {
          e.preventDefault();
          handleAddNew();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const displayValue = value?.label || placeholder;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            'w-full justify-between text-left h-10',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
          onKeyDown={handleKeyDown}
        >
          <span className="flex-1 flex items-center gap-2 truncate">
            {leftIcon && <span className="h-4 w-4 text-muted-foreground">{leftIcon}</span>}
            {displayValue}
          </span>
          <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')} />
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-md max-h-[80vh] p-0"
      >
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {showAddButton && searchText.trim() && (
          <Button
            variant="outline"
            className="mx-4 mb-2 w-[calc(100%-1rem)] justify-start gap-2 border-primary text-primary hover:bg-primary/5"
            onClick={handleAddNew}
          >
            <Plus className="h-4 w-4" />
            {addButtonText || `Add "${searchText.trim()}"`}
          </Button>
        )}

        <ScrollArea className="h-[400px] p-2">
          <div role="listbox" aria-multiselectable="false">
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {filteredOptions.length === 0 && !loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={cn(
                    'w-full px-3 py-2 rounded-md text-left transition-colors',
                    'hover:bg-accent focus:bg-accent',
                    index === highlightedIndex && 'bg-accent',
                    value?.id === option.id && 'bg-primary/10 text-primary font-medium'
                  )}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex-1">
                    <p className="font-medium truncate">{option.label}</p>
                    {option.subLabel && (
                      <p className="text-xs text-muted-foreground truncate">{option.subLabel}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {value && (
          <div className="px-4 py-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
              Clear selection
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}