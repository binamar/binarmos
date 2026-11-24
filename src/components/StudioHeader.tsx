import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Translations } from '../data/i18n';

export type StudioTab = 'visuals' | 'sound' | 'queue';

interface StudioHeaderProps {
  t: Translations;
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  onPickFiles: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  t,
  activeTab,
  onSelectTab,
  onPickFiles,
}) => {
  const navItems: { id: StudioTab; label: string }[] = [
    { id: 'visuals', label: t.tabVisuals },
    { id: 'sound', label: t.tabSound },
    { id: 'queue', label: t.tabQueue },
  ];

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0b1120]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        <a
          href="#stage-top"
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          {t.brand}
        </a>

        <nav className="hidden md:flex items-center gap-7" aria-label="Studio sections">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[1px] h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPickFiles}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span>{t.openMp3}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
