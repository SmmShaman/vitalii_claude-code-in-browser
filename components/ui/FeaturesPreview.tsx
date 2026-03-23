'use client'

import { useMemo } from 'react';
import { Brain, Video, Bot, Palette, Server, Layers, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Feature, FeatureCategory } from '@/data/features';
import { categories, getCategoryInfo, getProjectInfo } from '@/data/features';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Video, Bot, Palette, Server, Layers,
};

interface FeaturesPreviewProps {
  features: Feature[];
  backgroundText: string;
  currentLanguage: 'en' | 'no' | 'ua';
  onCategoryClick: (category: FeatureCategory) => void;
  onFeatureClick: (featureId: string) => void;
}

const labels = {
  en: {
    latest: 'Latest Features',
    seeAll: 'See all features in folders',
    features: 'features',
  },
  no: {
    latest: 'Siste funksjoner',
    seeAll: 'Se alle funksjoner i mapper',
    features: 'funksjoner',
  },
  ua: {
    latest: 'Останні функції',
    seeAll: 'Всі функції в папках',
    features: 'функцій',
  },
};

export const FeaturesPreview = ({
  features,
  backgroundText,
  currentLanguage,
  onCategoryClick,
  onFeatureClick,
}: FeaturesPreviewProps) => {
  const lang = currentLanguage;
  const t = labels[lang];

  const latestFeatures = useMemo(() => features.slice(0, 3), [features]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = features.filter((f) => f.category === cat.id).length;
    }
    return counts;
  }, [features]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden p-3 sm:p-4">
      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[4rem] sm:text-[6rem] font-black text-white/[0.03] whitespace-nowrap">
          {backgroundText}
        </span>
      </div>

      {/* Latest Features */}
      <div className="relative z-10 mb-2">
        <h3 className="text-[10px] sm:text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
          {t.latest}
        </h3>
        <div className="flex flex-col gap-1.5">
          {latestFeatures.map((feature) => {
            const catInfo = getCategoryInfo(feature.category);
            const project = getProjectInfo(feature.projectId);
            return (
              <motion.div
                key={feature.id}
                className="flex items-start gap-2 p-2 rounded-md bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-white/10 group"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeatureClick(feature.id);
                }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[8px] px-1 py-0.5 rounded ${
                      feature.projectId === 'portfolio'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {feature.projectId === 'portfolio' ? 'Portfolio' : 'JobBot'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-medium text-white/90 truncate group-hover:text-white">
                    {feature.title[lang]}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-white/40 truncate mt-0.5">
                    {feature.shortDescription[lang]}
                  </p>
                </div>
                <div className="flex gap-0.5 shrink-0 mt-1">
                  {feature.techStack.slice(0, 2).map((tech) => (
                    <span
                      key={tech}
                      className={`text-[7px] sm:text-[8px] px-1 py-0.5 rounded ${catInfo.color.bg} ${catInfo.color.text}`}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="relative z-10 flex items-center gap-2 my-1.5 sm:my-2">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[8px] sm:text-[9px] text-white/30 whitespace-nowrap">
          {t.seeAll}
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Category Folders */}
      <div className="relative z-10 grid grid-cols-3 gap-1.5 sm:gap-2 flex-1 min-h-0">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon];
          const count = categoryCounts[cat.id] || 0;
          return (
            <motion.button
              key={cat.id}
              className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg ${cat.color.bg} border border-white/5 hover:border-white/15 transition-all cursor-pointer group`}
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick(cat.id);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <FolderOpen className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${cat.color.text} opacity-70`} />
                {Icon && <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${cat.color.text}`} />}
              </div>
              <span className={`text-[8px] sm:text-[9px] font-medium ${cat.color.text} text-center leading-tight`}>
                {cat.label[lang]}
              </span>
              <span className="text-[7px] sm:text-[8px] text-white/30 mt-0.5">
                {count} {t.features}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
