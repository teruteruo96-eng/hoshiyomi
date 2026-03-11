'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface StatusToggleProps {
  tellerId: string;
  isOnline: boolean;
  onChange: (isOnline: boolean) => void;
}

export default function StatusToggle({ tellerId, isOnline, onChange }: StatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function toggle() {
    setLoading(true);
    const newStatus = !isOnline;
    const { error } = await supabase
      .from('tellers')
      .update({ is_online: newStatus })
      .eq('id', tellerId);

    if (!error) {
      onChange(newStatus);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-shippori ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
        {isOnline ? '● オンライン' : '○ オフライン'}
      </span>
      <button
        onClick={toggle}
        disabled={loading}
        className={`status-toggle ${isOnline ? 'online' : ''} ${loading ? 'opacity-50' : ''}`}
        aria-label={isOnline ? 'オフラインにする' : 'オンラインにする'}
      />
    </div>
  );
}
