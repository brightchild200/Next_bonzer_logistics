'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const CommandPaletteHeavy = dynamic(
  () => import('@/components/command-palette').then((m) => m.CommandPalette),
  {
    ssr: false,
    loading: () => null,
  }
);

export function CommandPaletteLoader({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [heavyLoaded, setHeavyLoaded] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (!heavyLoaded) {
        setHeavyLoaded(true);
      }
      setOpen(true);
    }
  }, [heavyLoaded, setOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!heavyLoaded) {
    return null;
  }

  return <CommandPaletteHeavy open={open} setOpen={setOpen} />;
}