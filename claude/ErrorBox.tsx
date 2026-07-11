// components/auth/ErrorBox.tsx
import { AlertCircle } from 'lucide-react';

interface ErrorBoxProps {
  message: string;
}

export function ErrorBox({ message }: ErrorBoxProps) {
  return (
    <div className="flex gap-3 p-3 bg-red-500/15 border-l-4 border-red-500 rounded-lg">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium text-red-200">{message}</p>
    </div>
  );
}
