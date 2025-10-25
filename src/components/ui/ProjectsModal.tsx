import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleProjectClick = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null); // Collapse if already expanded
    } else {
      setExpandedIndex(index); // Expand clicked project
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                const isExpanded = index === expandedIndex;

                return (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/20'
                        : 'bg-white/10 border border-white/20 hover:bg-white/20'
                    }`}
                    onClick={() => handleProjectClick(index)}
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

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-white/20">
                            <p className="text-sm text-white/90 leading-relaxed">
                              {project.full}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-2 text-xs text-white/60">
                      {isExpanded ? 'Click to collapse' : 'Click to expand'}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
