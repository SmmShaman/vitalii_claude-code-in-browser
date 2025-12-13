'use client'

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Project {
  title: string;
  short: string;
  full: string;
}

interface ProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  activeProjectIndex: number;
}

export const ProjectsModal = ({ open, onOpenChange, projects, activeProjectIndex }: ProjectsModalProps) => {
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

  return (
    <>
      {/* Grid View Modal */}
      <Dialog.Root open={open && !isDetailOpen} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl max-h-[90vh] bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <Dialog.Title className="text-2xl sm:text-3xl font-bold text-white">
                All Projects
              </Dialog.Title>
              <Dialog.Close className="text-white/70 hover:text-white transition-colors">
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
                          ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/20'
                          : 'bg-white/10 border border-white/20 hover:bg-white/20'
                      }`}
                      onClick={() => handleProjectClick(project)}
                    >
                      <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                        {project.title}
                        {isActive && (
                          <span className="text-xs bg-yellow-400/20 text-yellow-300 px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </h3>

                      <p className="text-sm text-white/80 mb-2">
                        {project.short}
                      </p>

                      <div className="mt-2 text-xs text-white/60">
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
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 z-[60] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <Dialog.Title className="text-2xl sm:text-3xl font-bold text-white">
                {selectedProject?.title}
              </Dialog.Title>
              <button
                onClick={handleDetailClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Project Details */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="prose prose-invert max-w-none">
                <p className="text-base sm:text-lg text-cyan-50 leading-relaxed whitespace-pre-line">
                  {selectedProject?.full}
                </p>
              </div>

              {/* Back Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleDetailClose}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 border border-white/20"
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
