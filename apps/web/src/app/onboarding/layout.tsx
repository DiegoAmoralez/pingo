import { requireUser } from '@/lib/session';
import { LanguageSwitcher } from '@/components/language-switcher';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <div className="fixed right-5 top-5 z-40"><LanguageSwitcher /></div>
      {children}
    </>
  );
}
