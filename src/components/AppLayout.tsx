import { ReactNode } from 'react';
import { TopNav } from '@/components/TopNav';
import { AlertsBell } from '@/components/AlertsBell';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CommandPalette } from '@/components/CommandPalette';
import { OnboardingTour } from '@/components/OnboardingTour';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNav />
      <main className="flex-1 p-4 pt-6 md:p-6 md:pt-8 overflow-auto">
        <Breadcrumbs />
        {children}
      </main>
      <CommandPalette />
      <OnboardingTour />
    </div>
  );
}
