"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import BottomNav from '@/app/components/BottomNav';
import { 
  Send, Loader2, ArrowLeft, MessageSquare, User, CheckCheck, Ghost
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Suspense } from 'react';

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // ... rest of the existing MessagesPage logic
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
