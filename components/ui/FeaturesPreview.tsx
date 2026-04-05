'use client'

import { useMemo } from 'react';
import { Brain, Video, Bot, Palette, Server, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Feature, FeatureCategory, ProjectInfo } from '@/data/features';
import { categories, getCategoryInfo, getProjectInfo } from '@/data/features';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Video, Bot, Palette, Server, Layers,
};

interface FeaturesPreviewProps {
  features: Feature[];
  projects?: ProjectInfo[];
  backgroundText: string;
  currentLanguage: 'en' | 'no' | 'ua';
  onCategoryClick: (category: FeatureCategory) => void;
  onFeatureClick: (featureId: string) => void;
}

const shortLabels: Record<FeatureCategory, { en: string; no: string; ua: string }> = {
  ai_automation: { en: 'AI', no: 'AI', ua: 'AI' },
  media_production: { en: 'Media', no: 'Media', ua: 'Медіа' },
  bot_scraping: { en: 'Bots', no: 'Boter', ua: 'Боти' },
  frontend_ux: { en: 'Frontend', no: 'Frontend', ua: 'Frontend' },
  devops_infra: { en: 'DevOps', no: 'DevOps', ua: 'DevOps' },
  other: { en: 'Other', no: 'Annet', ua: 'Інше' },
};

export const FeaturesPreview = ({
  features,
  projects: dynamicProjects,
  currentLanguage,
  onCategoryClick,
  onFeatureClick,
}: FeaturesPreviewProps) => {
  const lang = currentLanguage;

  const latestFeatures = useMemo(() => {
    const sorted = [...features].sort((a, b) => {
      if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      return 0;
    });
    return sorted.slice(0, 3);
  }, [features]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.id] = features.filter((f) => f.category === cat.id).length;
    }
    return counts;
  }, [features]);

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Latest Features — 3 items */}
      <div className="relative z-10">
        <div className="flex flex-col gap-1">
          {latestFeatures.map((feature) => {
            const catInfo = getCategoryInfo(feature.category);
            return (
              <motion.div
                key={feature.id}
                className="p-2 rounded-md bg-surface-elevated/50 hover:bg-surface-elevated cursor-pointer transition-all border border-transparent hover:border-surface-border group"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeatureClick(feature.id);
                }}
                whileHover={{ scale: 1.01 }}
              >
                {/* Row 1: badge + date + title */}
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const proj = getProjectInfo(feature.projectId, dynamicProjects);
                    return (
                      <span className={`text-[10px] px-1 py-0.5 rounded shrink-0 ${proj.color.bg} ${proj.color.text}`}>
                        {proj.badge}
                      </span>
                    );
                  })()}
                  {feature.createdAt && (
                    <span className="text-[9px] text-content-faint shrink-0 tabular-nums">
                      {new Date(feature.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  <p className="text-[10px] sm:text-xs font-medium text-content-secondary truncate group-hover:text-content">
                    {feature.title[lang]}
                  </p>
                </div>
                {/* Row 2: tech stack */}
                <div className="flex gap-1 mt-1 pl-5">
                  {feature.techStack.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      className={`text-[10px] px-1 py-0.5 rounded ${catInfo.color.bg} ${catInfo.color.text}`}
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

      {/* Category Folders — 3x2 compact grid */}
      <div className="relative z-10 grid grid-cols-3 gap-1.5">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon];
          const count = categoryCounts[cat.id] || 0;
          return (
            <motion.button
              key={cat.id}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg ${cat.color.bg} border border-surface-border/50 hover:border-surface-border-hover transition-all cursor-pointer`}
              onClick={(e) => {
                e.stopPropagation();
                onCategoryClick(cat.id);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              {Icon && <Icon className={`w-3 h-3 ${cat.color.text} shrink-0`} />}
              <span className={`text-[10px] sm:text-[10px] font-medium ${cat.color.text} truncate`}>
                {shortLabels[cat.id][lang]}
              </span>
              <span className="text-[10px] text-content-faint shrink-0">
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
