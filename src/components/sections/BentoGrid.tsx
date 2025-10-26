import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from '../../contexts/TranslationContext';
import { SectionDialog } from './SectionDialog';
import { TypewriterText } from '../ui/TypewriterText';
import { ProjectsCarousel } from '../ui/ProjectsCarousel';
import { ProjectsModal } from '../ui/ProjectsModal';
import { ServicesAnimation } from '../ui/ServicesAnimation';
import { translations } from '../../utils/translations';
import { useScreenSize } from '../../hooks/useScreenSize';

interface Section {
  id: string;
  titleKey: string;
  contentKey: string;
  image: string;
}

const sections: Section[] = [
  {
    id: 'about',
    titleKey: 'about_title',
    contentKey: 'about_content',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
  },
  {
    id: 'projects',
    titleKey: 'projects_title',
    contentKey: 'projects_content',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  },
  {
    id: 'services',
    titleKey: 'services_title',
    contentKey: 'services_content',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
  },
  {
    id: 'skills',
    titleKey: 'skills_title',
    contentKey: 'skills_content',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
  },
  {
    id: 'testimonials',
    titleKey: 'testimonials_title',
    contentKey: 'testimonials_content',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216',
  },
  {
    id: 'contact',
    titleKey: 'contact_title',
    contentKey: 'contact_description',
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d',
  },
];

export const BentoGrid = () => {
  const { t, currentLanguage } = useTranslations();
  const screenSize = useScreenSize();
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleCardClick = (section: Section, cardElement: HTMLDivElement | null) => {
    if (!cardElement) return;

    // Don't open dialog for projects and services sections (they handle their own clicks)
    if (section.id === 'projects' || section.id === 'services') return;

    // Add snake animation class
    cardElement.classList.add('snake-animation');

    // Get card position
    const rect = cardElement.getBoundingClientRect();
    cardElement.style.position = 'fixed';
    cardElement.style.top = `${rect.top}px`;
    cardElement.style.left = `${rect.left}px`;
    cardElement.style.width = `${rect.width}px`;
    cardElement.style.height = `${rect.height}px`;

    // Trigger expansion
    setTimeout(() => {
      cardElement.classList.add('snake-expanded');
    }, 50);

    // Open dialog after animation
    setTimeout(() => {
      setSelectedSection(section);
      setIsDialogOpen(true);

      // Reset card styles
      cardElement.classList.remove('snake-animation', 'snake-expanded');
      cardElement.style.position = '';
      cardElement.style.top = '';
      cardElement.style.left = '';
      cardElement.style.width = '';
      cardElement.style.height = '';
    }, 600);
  };

  const handleProjectsCardClick = (activeIndex: number) => {
    console.log('handleProjectsCardClick called with index:', activeIndex);
    setActiveProjectIndex(activeIndex);
    setIsProjectsModalOpen(true);
  };

  const handleProjectIndexChange = (index: number) => {
    setCurrentProjectIndex(index);
  };

  // Get current project image
  const currentProjects = translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].projects_list;
  const currentProjectImage = currentProjects[currentProjectIndex]?.image || sections.find(s => s.id === 'projects')?.image;

  return (
    <>
      <div className="h-full w-full overflow-y-auto overflow-x-hidden flex items-center justify-center px-2 sm:px-4 lg:px-6">
        <div className="w-full flex items-center justify-center py-2">
          <div
            className="grid gap-3 sm:gap-4 w-full"
            style={{
              gridTemplateColumns: `repeat(${screenSize.columnsCount}, 1fr)`,
            }}
          >
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                ref={(el) => {
                  cardRefs.current[section.id] = el;
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={section.id === 'projects' || section.id === 'services' ? undefined : () => handleCardClick(section, cardRefs.current[section.id])}
                className="relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full"
                style={{
                  height: 'clamp(200px, 25vh, 280px)',
                }}
              >
                {/* Background - conditional based on section */}
                {section.id === 'about' ? (
                  <div className="absolute inset-0 bg-white" />
                ) : section.id === 'services' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                    style={{
                      backgroundImage: `url(${section.id === 'projects' ? currentProjectImage : section.image})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                )}

                {/* Content */}
                <div className="relative h-full max-h-full flex items-start justify-center p-4 sm:p-5 md:p-6 overflow-hidden">
                  {section.id === 'about' ? (
                    <div className="w-full h-full max-h-full overflow-hidden flex flex-col">
                      <TypewriterText
                        text={t(section.contentKey as any)}
                        speed={30}
                      />
                    </div>
                  ) : section.id === 'projects' ? (
                    <div className="w-full h-full overflow-hidden">
                      <ProjectsCarousel
                        projects={translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].projects_list}
                        onCardClick={handleProjectsCardClick}
                        backgroundText={t('projects_title') as string}
                        onIndexChange={handleProjectIndexChange}
                      />
                    </div>
                  ) : section.id === 'services' ? (
                    <div className="w-full h-full overflow-hidden">
                      <ServicesAnimation
                        services={translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].services_list}
                        backgroundText={t('services_title') as string}
                      />
                    </div>
                  ) : (
                    <h3
                      className="font-bold text-white text-center drop-shadow-lg self-center px-2"
                      style={{ fontSize: 'clamp(1.25rem, 3vw, 2.5rem)' }}
                    >
                      {t(section.titleKey as any)}
                    </h3>
                  )}
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Dialog */}
      {selectedSection && (
        <SectionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={t(selectedSection.titleKey as any)}
          content={t(selectedSection.contentKey as any)}
          image={selectedSection.image}
          sectionId={selectedSection.id}
        />
      )}

      {/* Projects Modal */}
      <ProjectsModal
        open={isProjectsModalOpen}
        onOpenChange={setIsProjectsModalOpen}
        projects={translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].projects_list}
        activeProjectIndex={activeProjectIndex}
      />
    </>
  );
};
