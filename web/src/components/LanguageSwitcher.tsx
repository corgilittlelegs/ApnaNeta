import React from 'react';
import { Translate } from '@phosphor-icons/react';
import { useLanguage } from '../context/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label="Language selection / भाषा चुनें"
      className={`inline-flex items-center bg-sovereign-900/90 p-0.5 rounded-xl border border-sovereign-700/90 shadow-xs ${className}`}
    >
      <div className="flex items-center pl-1.5 pr-1 text-kesariya-400 select-none">
        <Translate size={14} weight="bold" />
      </div>

      <button
        type="button"
        role="radio"
        aria-checked={language === 'en'}
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-kesariya-500 text-sovereign-950 font-bold shadow-xs'
            : 'text-dholpur-300 hover:text-white hover:bg-sovereign-800/60'
        }`}
        title="Switch to English"
      >
        EN
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={language === 'hi'}
        onClick={() => setLanguage('hi')}
        className={`px-2 py-1 rounded-lg text-xs font-semibold font-devanagari transition-all cursor-pointer ${
          language === 'hi'
            ? 'bg-kesariya-500 text-sovereign-950 font-bold shadow-xs'
            : 'text-dholpur-300 hover:text-white hover:bg-sovereign-800/60'
        }`}
        title="हिंदी में बदलें"
      >
        हिंदी
      </button>
    </div>
  );
};
