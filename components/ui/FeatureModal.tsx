'use client'

import React, { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, Brain, Video, Bot, Palette, Server, Layers, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Feature, FeatureCategory, ProjectId, ProjectInfo } from '@/data/features';
import { categories, getCategoryInfo, getProjectInfo, projects as staticProjects } from '@/data/features';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Video, Bot, Palette, Server, Layers,
};

// Display commit hash + date for DB-sourced features
function FeatureMeta({ feature, projectUrl }: { feature: Feature; projectUrl?: string }) {
  const ext = feature as Feature & { sourceCommits?: string[]; createdAt?: string; repoUrl?: string | null }
  const commits = ext.sourceCommits || []
  const repoUrl = ext.repoUrl || null
  const date = ext.createdAt ? new Date(ext.createdAt).toLocaleDateString('no-NO') : null

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/30">
      {date && <span>{date}</span>}
      {commits.slice(0, 2).map(hash => {
        const short = hash.slice(0, 7)
        return repoUrl ? (
          <a key={hash} href={`${repoUrl}/commit/${hash}`} target="_blank" rel="noopener noreferrer"
            className="font-mono text-white/40 hover:text-white/80 underline decoration-white/20 hover:decoration-white/60 transition-colors">
            {short}
          </a>
        ) : <span key={hash} className="font-mono">{short}</span>
      })}
      {projectUrl && (
        <a href={projectUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
          <ExternalLink className="w-3 h-3" /> {projectUrl}
        </a>
      )}
    </div>
  )
}

interface FeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: Feature[];
  projects?: ProjectInfo[];
  initialCategory?: FeatureCategory;
  initialFeatureId?: string;
  currentLanguage: 'en' | 'no' | 'ua';
}

export const FeatureModal = ({
  open,
  onOpenChange,
  features,
  projects: dynamicProjects,
  initialCategory,
  initialFeatureId,
  currentLanguage,
}: FeatureModalProps) => {
  const projectList = dynamicProjects || staticProjects;
  const lang = currentLanguage;
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>(initialCategory || 'ai_automation');
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<ProjectId | 'all'>('all');
  const [techFilter, setTechFilter] = useState<string | null>(null);

  // Sync state when props change (modal opens with new initialFeatureId/initialCategory)
  React.useEffect(() => {
    if (!open) return;
    setProjectFilter('all');
    setTechFilter(null);
    if (initialFeatureId) {
      const feature = features.find((f) => f.id === initialFeatureId);
      if (feature) {
        setActiveCategory(feature.category);
        setSelectedFeature(feature);
        setIsDetailOpen(true);
        return;
      }
    }
    setActiveCategory(initialCategory || 'ai_automation');
    setSelectedFeature(null);
    setIsDetailOpen(false);
  }, [open, initialFeatureId, initialCategory, features]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const activeFilter = techFilter;

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      if (techFilter) {
        return f.techStack.some(t => t.toLowerCase() === techFilter.toLowerCase());
      }
      if (f.category !== activeCategory) return false;
      if (projectFilter !== 'all' && f.projectId !== projectFilter) return false;
      return true;
    });
  }, [features, activeCategory, projectFilter, techFilter]);

  const categoryFeatures = useMemo(() => {
    if (activeFilter) return filteredFeatures;
    return features.filter((f) => f.category === activeCategory);
  }, [features, activeCategory, activeFilter, filteredFeatures]);

  const handleFeatureClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setIsDetailOpen(true);
  };

  const handleHashtagClick = (tag: string) => {
    // Navigate to /search with tag filter (news/blog articles)
    const cleanTag = tag.replace('#', '');
    window.location.href = `/search?tag=${encodeURIComponent(cleanTag)}`;
  };

  const handleTechClick = (tech: string) => {
    setTechFilter(tech);
    setIsDetailOpen(false);
    setSelectedFeature(null);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedFeature(null);
  };

  const navigateFeature = (direction: 'prev' | 'next') => {
    if (!selectedFeature) return;
    const idx = categoryFeatures.findIndex((f) => f.id === selectedFeature.id);
    const newIdx = direction === 'next'
      ? (idx + 1) % categoryFeatures.length
      : (idx - 1 + categoryFeatures.length) % categoryFeatures.length;
    setSelectedFeature(categoryFeatures[newIdx]);
  };

  const labels = {
    en: {
      title: 'Features',
      allProjects: 'All',
      details: 'Click to view details',
      problem: 'Problem',
      solution: 'How it works',
      result: 'Result',
      techStack: 'Tech Stack',
      back: 'Back to list',
      project: 'Project',
      featureOf: 'of',
    },
    no: {
      title: 'Funksjoner',
      allProjects: 'Alle',
      details: 'Klikk for detaljer',
      problem: 'Problem',
      solution: 'Hvordan det fungerer',
      result: 'Resultat',
      techStack: 'Teknologier',
      back: 'Tilbake til listen',
      project: 'Prosjekt',
      featureOf: 'av',
    },
    ua: {
      title: 'Функції',
      allProjects: 'Всі',
      details: 'Натисніть для деталей',
      problem: 'Проблема',
      solution: 'Як це працює',
      result: 'Результат',
      techStack: 'Технології',
      back: 'Назад до списку',
      project: 'Проект',
      featureOf: 'з',
    },
  };

  const t = labels[lang];

  return (
    <>
      {/* Category Browser Modal */}
      <Dialog.Root open={open && !isDetailOpen} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl max-h-[90vh] bg-gradient-to-br from-surface to-surface-elevated backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <Dialog.Title className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                {activeFilter ? (
                  <>
                    <span className="text-sm font-normal text-white/50">{t.title} /</span>
                    <span className={`text-lg ${techFilter ? 'text-blue-400' : 'text-white/80'}`}>{activeFilter}</span>
                    <span className="text-xs text-white/30">({filteredFeatures.length})</span>
                    <button
                      onClick={() => setTechFilter(null)}
                      className="ml-1 text-white/40 hover:text-white/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  t.title
                )}
              </Dialog.Title>
              <Dialog.Close className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </Dialog.Close>
            </div>

            {/* Category Tabs */}
            <div className={`px-4 sm:px-6 pt-4 flex flex-wrap gap-2 ${activeFilter ? 'hidden' : ''}`}>
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon];
                const count = features.filter((f) => f.category === cat.id).length;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? `${cat.color.bg} ${cat.color.text} border border-current/30`
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="hidden sm:inline">{cat.label[lang]}</span>
                    <span className="text-xs opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Project Filter */}
            <div className="px-4 sm:px-6 pt-3 flex flex-wrap gap-2">
              {(['all' as const, ...projectList.filter(p => features.some(f => f.projectId === p.id)).map(p => p.id)]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProjectFilter(filter)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    projectFilter === filter
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {filter === 'all' ? t.allProjects : getProjectInfo(filter, projectList).name[lang]}
                </button>
              ))}
            </div>

            {/* Features Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredFeatures.map((feature, index) => {
                    const catInfo = getCategoryInfo(feature.category);
                    const project = getProjectInfo(feature.projectId, projectList);
                    return (
                      <motion.div
                        key={feature.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.02 }}
                        className="p-4 rounded-lg cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                        onClick={() => handleFeatureClick(feature)}
                      >
                        {/* Project badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${project.color.bg} ${project.color.text}`}>
                            {project.name[lang]}
                          </span>
                          <span className="text-[10px] text-white/30">{feature.id.toUpperCase()}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-white mb-1.5 line-clamp-2 group-hover:text-white/90">
                          {feature.title[lang]}
                        </h3>

                        {/* Short description */}
                        <p className="text-xs text-white/50 mb-3 line-clamp-2">
                          {feature.shortDescription[lang]}
                        </p>

                        {/* Tech stack */}
                        <div className="flex flex-wrap gap-1">
                          {feature.techStack.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${catInfo.color.bg} ${catInfo.color.text}`}
                            >
                              {tech}
                            </span>
                          ))}
                          {feature.techStack.length > 3 && (
                            <span className="text-[10px] text-white/30">
                              +{feature.techStack.length - 3}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {filteredFeatures.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  No features in this category for selected project
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Feature Detail Modal */}
      <Dialog.Root
        open={isDetailOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleDetailClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-gradient-to-br from-surface to-[#28282C] backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 z-[60] overflow-hidden">
            {selectedFeature && (() => {
              const catInfo = getCategoryInfo(selectedFeature.category);
              const project = getProjectInfo(selectedFeature.projectId, projectList);
              const Icon = iconMap[catInfo.icon];
              const currentIdx = categoryFeatures.findIndex((f) => f.id === selectedFeature.id);

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${catInfo.color.bg} shrink-0`}>
                        {Icon && <Icon className={`w-5 h-5 ${catInfo.color.text}`} />}
                      </div>
                      <div className="min-w-0">
                        <Dialog.Title className="text-lg sm:text-xl font-bold text-white truncate">
                          {selectedFeature.title[lang]}
                        </Dialog.Title>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${project.color.bg} ${project.color.text}`}>
                            {project.name[lang]}
                          </span>
                          <span className="text-xs text-white/30">
                            {currentIdx + 1} {t.featureOf} {categoryFeatures.length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleDetailClose}
                      className="text-white/70 hover:text-white transition-colors shrink-0"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                    {/* Problem */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
                        {t.problem}
                      </h4>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {selectedFeature.problem[lang]}
                      </p>
                    </div>

                    {/* Solution */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">
                        {t.solution}
                      </h4>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {selectedFeature.solution[lang]}
                      </p>
                    </div>

                    {/* Result */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">
                        {t.result}
                      </h4>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {selectedFeature.result[lang]}
                      </p>
                    </div>

                    {/* Tech Stack */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
                        {t.techStack}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFeature.techStack.map((tech) => (
                          <button
                            key={tech}
                            onClick={() => handleTechClick(tech)}
                            className={`text-xs px-2.5 py-1 rounded-md ${catInfo.color.bg} ${catInfo.color.text} border border-current/20 hover:brightness-125 cursor-pointer transition-all`}
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hashtags — clickable */}
                    {selectedFeature.hashtags.length > 0 && (
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-1.5">
                          {selectedFeature.hashtags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => handleHashtagClick(tag)}
                              className="text-xs text-white/40 hover:text-white/80 hover:bg-white/10 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Commit info + Project Link */}
                    <FeatureMeta feature={selectedFeature} projectUrl={project.url} />

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                      <button
                        onClick={() => navigateFeature('prev')}
                        className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-all text-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      <button
                        onClick={handleDetailClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm border border-white/20"
                      >
                        {t.back}
                      </button>

                      <button
                        onClick={() => navigateFeature('next')}
                        className="flex items-center gap-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-all text-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
