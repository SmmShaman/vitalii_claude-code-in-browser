'use client'

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface ProjectHighlight {
  emoji: string;
  title: string;
  desc: string;
}

interface Project {
  title: string;
  short: string;
  full: string;
  image?: string;
  projectId?: string;
  intro?: string;
  highlights?: ProjectHighlight[];
  featureCount?: number;
}

interface ProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  activeProjectIndex: number;
  onViewFeatures?: (projectId: string) => void;
}

export const ProjectsModal = ({ open, onOpenChange, projects, activeProjectIndex, onViewFeatures }: ProjectsModalProps) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    setSelectedProject(null);
  };

  const handleViewFeatures = (projectId: string) => {
    onViewFeatures?.(projectId);
    // Close both modals
    setIsDetailOpen(false);
    setSelectedProject(null);
    onOpenChange(false);
  };

  return (
    <>
      {/* Grid View Modal */}
      <Dialog.Root open={open && !isDetailOpen} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl max-h-[90vh] bg-surface-darker/95 backdrop-blur-md rounded-2xl shadow-2xl border border-surface-border z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <Dialog.Title className="text-2xl sm:text-3xl font-bold text-content">
                All Projects
              </Dialog.Title>
              <Dialog.Close className="text-content-muted hover:text-content transition-colors">
                <X className="w-6 h-6" />
              </Dialog.Close>
            </div>

            {/* Projects Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project, index) => {
                  const isActive = index === activeProjectIndex;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'bg-brand/20 border-2 border-brand/40 shadow-lg shadow-brand/20'
                          : 'bg-surface-elevated border border-surface-border hover:bg-surface-border'
                      }`}
                      onClick={() => handleProjectClick(project)}
                    >
                      <h3 className="text-lg font-bold text-content mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {project.image && (
                            <Image
                              src={project.image}
                              alt={project.title}
                              width={40}
                              height={40}
                              className="rounded-md object-cover w-10 h-10 flex-shrink-0"
                            />
                          )}
                          {project.title}
                        </span>
                        {isActive && (
                          <span className="text-xs bg-brand/20 text-brand-light px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </h3>

                      <p className="text-base text-content-secondary mb-2 leading-relaxed">
                        {project.short}
                      </p>

                      <div className="mt-2 text-xs text-content-muted">
                        Click to view details
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Detail View Modal */}
      <Dialog.Root open={isDetailOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleDetailClose();
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-surface-darker/95 backdrop-blur-md rounded-2xl shadow-2xl border border-surface-border z-[60] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-border">
              <Dialog.Title className="text-2xl sm:text-3xl font-bold text-content">
                {selectedProject?.title}
              </Dialog.Title>
              <button
                onClick={handleDetailClose}
                className="text-content-muted hover:text-content transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Project Details */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Cover Image */}
              {selectedProject?.image && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <Image
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    width={900}
                    height={200}
                    className="w-full max-h-[200px] object-cover rounded-xl"
                  />
                </div>
              )}

              {/* Intro / Full Description */}
              <div className="prose prose-invert max-w-none">
                <p className="text-base sm:text-lg text-content-secondary leading-relaxed whitespace-pre-line">
                  {selectedProject?.intro || selectedProject?.full}
                </p>
              </div>

              {/* Highlights Grid */}
              {selectedProject?.highlights && selectedProject.highlights.length > 0 && (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedProject.highlights.map((highlight, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="bg-surface-elevated rounded-lg p-3 border border-surface-border"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl leading-none flex-shrink-0">{highlight.emoji}</span>
                          <div>
                            <h4 className="font-bold text-content text-sm">{highlight.title}</h4>
                            <p className="text-content-secondary text-base mt-0.5 leading-relaxed">{highlight.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Count Badge + Explore Button */}
              {selectedProject?.projectId && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {selectedProject.featureCount != null && selectedProject.featureCount > 0 && (
                    <span className="text-sm text-content-muted bg-surface-elevated px-3 py-1.5 rounded-full border border-surface-border">
                      {selectedProject.featureCount} published feature{selectedProject.featureCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {onViewFeatures && (
                    <button
                      onClick={() => handleViewFeatures(selectedProject.projectId!)}
                      className="px-5 py-2 bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-all duration-300 border border-brand/30 text-sm font-medium"
                    >
                      Explore Features &rarr;
                    </button>
                  )}
                </div>
              )}

              {/* Back Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleDetailClose}
                  className="px-6 py-2 bg-surface-elevated hover:bg-surface-border text-content rounded-lg transition-all duration-300 border border-surface-border"
                >
                  Back to Projects
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
