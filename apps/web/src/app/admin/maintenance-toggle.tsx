'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/locale-provider';
import { setMaintenanceAction } from './actions';

export function MaintenanceToggle({ enabled }: { enabled: boolean }) {
  const { tr } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(enabled);

  const handleToggle = () => {
    const next = !optimisticEnabled;
    startTransition(async () => {
      setOptimisticEnabled(next);
      await setMaintenanceAction(next);
      router.refresh();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleToggle();
  };

  return (
    <div className="flex items-center gap-4">
      <span
        className={`text-sm font-bold ${optimisticEnabled ? 'text-warn' : 'text-ok'}`}
        aria-live="polite"
      >
        {optimisticEnabled ? tr('Maintenance ON', 'Заглушка включена') : tr('Site is live', 'Сайт работает')}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={optimisticEnabled}
        aria-label={tr('Toggle maintenance mode', 'Переключить режим техобслуживания')}
        tabIndex={0}
        disabled={pending}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60 ${
          optimisticEnabled ? 'bg-warn' : 'bg-[#d6ded8]'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
            optimisticEnabled ? 'translate-x-6' : 'translate-x-0'
          }`}
          aria-hidden
        />
      </button>
    </div>
  );
}
