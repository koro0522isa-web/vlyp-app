"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info, Coins, Heart, UserPlus, Trophy } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'coin' | 'like' | 'follow' | 'achievement';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check className="w-4 h-4" />,
  error: <X className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  coin: <Coins className="w-4 h-4" />,
  like: <Heart className="w-4 h-4 fill-current" />,
  follow: <UserPlus className="w-4 h-4" />,
  achievement: <Trophy className="w-4 h-4" />,
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/20 border-red-500/30 text-red-400',
  warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  coin: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
  like: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
  follow: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  achievement: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast Container — fixed at top center */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className={`pointer-events-auto w-full flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl cursor-pointer ${STYLES[t.type]}`}
              onClick={() => removeToast(t.id)}
            >
              <div className="flex-shrink-0">{ICONS[t.type]}</div>
              <p className="text-sm font-bold flex-1">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
