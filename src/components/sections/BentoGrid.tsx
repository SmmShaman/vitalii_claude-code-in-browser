import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from '../../contexts/TranslationContext';
import { SectionDialog } from './SectionDialog';
import { TypewriterText } from '../ui/TypewriterText';
import { ProjectsCarousel } from '../ui/ProjectsCarousel';
import { ProjectsModal } from '../ui/ProjectsModal';
import { ServicesAnimation } from '../ui/ServicesAnimation';
import { SkillsAnimation } from '../ui/SkillsAnimation';
import { AboutAnimation } from '../ui/AboutAnimation';
import { AnimatedHeaderTitle } from '../ui/AnimatedHeaderTitle';
import { AnimatedDescription } from '../ui/AnimatedDescription';
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
  const [isSkillsExploding, setIsSkillsExploding] = useState(false);
  const [isAboutExploding, setIsAboutExploding] = useState(false);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const skillsTimeoutRef = useRef<number | null>(null);

  const handleAboutClick = () => {
    console.log('🎯 About clicked! Starting explosion animation');
    console.log('📦 Grid ref:', gridContainerRef.current);

    // Start explosion animation (no timeout - stays until user closes)
    console.log('💥 Setting isAboutExploding = true');
    setIsAboutExploding(true);
  };

  const handleAboutClose = () => {
    console.log('❌ About close clicked');
    setIsAboutExploding(false);
  };

  const handleCardClick = (section: Section, cardElement: HTMLDivElement | null) => {
    if (!cardElement) return;

    // Don't open dialog for projects section (it has its own modal)
    if (section.id === 'projects') return;

    // Handle about explosion animation
    if (section.id === 'about') {
      handleAboutClick();
      return;
    }

    // Handle skills explosion animation
    if (section.id === 'skills') {
      // Clear any existing timeout
      if (skillsTimeoutRef.current) {
        clearTimeout(skillsTimeoutRef.current);
        skillsTimeoutRef.current = null;
      }

      // Start explosion animation
      setIsSkillsExploding(true);

      // After 3 seconds, return to normal
      skillsTimeoutRef.current = window.setTimeout(() => {
        setIsSkillsExploding(false);
        skillsTimeoutRef.current = null;
      }, 3000);

      return;
    }

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

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);

    // When closing dialog, ensure all cards are reset to normal state
    if (!open) {
      // Small delay to ensure dialog is fully closed
      setTimeout(() => {
        Object.values(cardRefs.current).forEach(cardElement => {
          if (cardElement) {
            // Remove all animation classes
            cardElement.classList.remove('snake-animation', 'snake-expanded');

            // Remove only the specific inline styles added by the snake animation
            // Preserve Framer Motion styles (opacity, transform from initial animation)
            cardElement.style.removeProperty('position');
            cardElement.style.removeProperty('top');
            cardElement.style.removeProperty('left');
            cardElement.style.removeProperty('width');
            cardElement.style.removeProperty('z-index');

            // Reset height to ensure proper size based on screen size
            cardElement.style.height = screenSize.isSmall ? 'clamp(140px, 20vh, 200px)' : 'clamp(200px, 25vh, 280px)';
          }
        });
      }, 50);
    }
  };

  // Get current project image
  const currentProjects = translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].projects_list;
  const currentProjectImage = currentProjects[currentProjectIndex]?.image || sections.find(s => s.id === 'projects')?.image;

  return (
    <>
      <div className={`h-full w-full overflow-y-auto overflow-x-hidden flex ${screenSize.isSmall ? 'items-start' : 'items-center'} justify-center px-2 sm:px-4 lg:px-6`}>
        <div className={`w-full flex flex-col ${screenSize.isSmall ? 'items-start' : 'items-center'} justify-center py-2 sm:py-3 md:py-4`}>

          {/* Title Section - moved from header with white background */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8 w-full bg-white rounded-lg shadow-lg px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
            <AnimatedHeaderTitle
              text={t('title') as string}
              namePattern={/Vitalii Berbeha|Віталій Бербега/}
            />
            <h2
              className="text-gray-700 mt-2 leading-tight"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}
            >
              {t('subtitle')}
            </h2>
            <AnimatedDescription text={t('description') as string} />
          </div>

          <div
            ref={gridContainerRef}
            className="grid gap-2 sm:gap-3 md:gap-4 w-full"
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
                animate={{
                  opacity: (isSkillsExploding || isAboutExploding) ? 0 : 1,
                  y: (isSkillsExploding || isAboutExploding) ? 0 : 0,
                  scale: (isSkillsExploding || isAboutExploding) ? 0.95 : 1
                }}
                transition={{
                  duration: (isSkillsExploding || isAboutExploding) ? 0.3 : 0.3,
                  delay: (isSkillsExploding || isAboutExploding) ? 0 : index * 0.1
                }}
                onClick={section.id === 'projects' ? undefined : () => handleCardClick(section, cardRefs.current[section.id])}
                className="relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full"
                style={{
                  height: screenSize.isSmall ? 'clamp(140px, 20vh, 200px)' : 'clamp(200px, 25vh, 280px)',
                  pointerEvents: (isSkillsExploding || isAboutExploding) ? 'none' : 'auto'
                }}
              >
                {/* Background - conditional based on section */}
                {section.id === 'about' ? (
                  <div className="absolute inset-0 bg-white" />
                ) : section.id === 'services' || section.id === 'skills' ? (
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
                <div className={`relative h-full max-h-full flex items-start justify-center ${section.id === 'about' ? 'p-1.5 sm:p-3 md:p-4' : 'p-3 sm:p-4 md:p-5'} overflow-hidden`}>
                  {section.id === 'about' ? (
                    <div className="w-full h-full max-h-full flex flex-col">
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
                  ) : section.id === 'skills' ? (
                    <div className="w-full h-full overflow-hidden">
                      <SkillsAnimation
                        skills={translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].skills_list}
                        backgroundText={t('skills_title') as string}
                        isExploding={isSkillsExploding}
                        gridContainerRef={gridContainerRef}
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
          onOpenChange={handleDialogClose}
          title={t(selectedSection.titleKey as any)}
          content={t(selectedSection.contentKey as any)}
          image={selectedSection.image}
          sectionId={selectedSection.id}
        />
      )}

      {/* About Animation */}
      <AboutAnimation
        text={t('about_content') as string}
        isExploding={isAboutExploding}
        gridContainerRef={gridContainerRef}
        onClose={handleAboutClose}
      />

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
