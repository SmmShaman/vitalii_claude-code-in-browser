import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from '../../contexts/TranslationContext';
import { SectionDialog } from './SectionDialog';
import { TypewriterText } from '../ui/TypewriterText';
import { ProjectsCarousel } from '../ui/ProjectsCarousel';
import { ProjectsModal } from '../ui/ProjectsModal';
import { ServicesAnimation } from '../ui/ServicesAnimation';
import { SkillsAnimation } from '../ui/SkillsAnimation';
import { AnimatedHeaderTitle } from '../ui/AnimatedHeaderTitle';
import { AnimatedDescription } from '../ui/AnimatedDescription';
import { NewsSection } from './NewsSection';
import { BlogSection } from './BlogSection';
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
    id: 'services',
    titleKey: 'services_title',
    contentKey: 'services_content',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
  },
  {
    id: 'projects',
    titleKey: 'projects_title',
    contentKey: 'projects_content',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  },
  {
    id: 'skills',
    titleKey: 'skills_title',
    contentKey: 'skills_content',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
  },
  {
    id: 'news',
    titleKey: 'news_title',
    contentKey: 'news_description',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c',
  },
  {
    id: 'blog',
    titleKey: 'blog_title',
    contentKey: 'blog_description',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643',
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
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);
  const [isBlogExpanded, setIsBlogExpanded] = useState(false);
  const [isServicesHiding, setIsServicesHiding] = useState(false);
  const [isProjectsHiding, setIsProjectsHiding] = useState(false);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleNewsClick = () => {
    if (!isNewsExpanded) {
      // Start hiding Services first
      setIsServicesHiding(true);
      // After 0.5s, expand News
      setTimeout(() => {
        setIsNewsExpanded(true);
        setIsServicesHiding(false);
      }, 500);
    } else {
      setIsNewsExpanded(false);
    }
  };

  const handleBlogClick = () => {
    if (!isBlogExpanded) {
      // Start hiding Projects first
      setIsProjectsHiding(true);
      // After 0.5s, expand Blog
      setTimeout(() => {
        setIsBlogExpanded(true);
        setIsProjectsHiding(false);
      }, 500);
    } else {
      setIsBlogExpanded(false);
    }
  };

  const handleCardClick = (section: Section, cardElement: HTMLDivElement | null) => {
    if (!cardElement) return;

    // Don't open dialog for sections that have their own modals
    if (section.id === 'projects') return;

    // Handle news expansion separately
    if (section.id === 'news') {
      handleNewsClick();
      return;
    }

    // Handle blog expansion separately
    if (section.id === 'blog') {
      handleBlogClick();
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
            className="grid gap-2 sm:gap-3 md:gap-4 w-full relative"
            style={{
              gridTemplateColumns: `repeat(${screenSize.columnsCount}, 1fr)`,
              gridAutoRows: screenSize.isSmall ? 'clamp(140px, 20vh, 200px)' : 'clamp(200px, 25vh, 280px)',
            }}
          >
            <AnimatePresence mode="sync">
              {sections.map((section) => {
                // Check if section should be visible
                const isHidden =
                  (section.id === 'services' && (isServicesHiding || isNewsExpanded)) ||
                  (section.id === 'projects' && (isProjectsHiding || isBlogExpanded || isNewsExpanded)) ||
                  (section.id === 'skills' && (isNewsExpanded || isBlogExpanded));

                if (isHidden) return null;

                const isExpanded =
                  (section.id === 'news' && isNewsExpanded) ||
                  (section.id === 'blog' && isBlogExpanded);

                // Calculate grid position for upward expansion (full width)
                const getGridStyle = () => {
                  if (section.id === 'news' && isNewsExpanded) {
                    // News jumps to row 1 (where Services was) and spans 2 rows, full width
                    return {
                      gridRow: '1 / 3', // Start at row line 1, end at row line 3 (covers rows 1-2)
                      gridColumn: screenSize.columnsCount === 2 ? '1 / 3' : '1', // Full width (columns 1-2)
                    };
                  }
                  if (section.id === 'blog' && isBlogExpanded) {
                    // Blog jumps to row 1 and spans 2 rows, full width
                    return {
                      gridRow: '1 / 3', // Start at row line 1, end at row line 3 (covers rows 1-2)
                      gridColumn: screenSize.columnsCount === 2 ? '1 / 3' : '1', // Full width
                    };
                  }
                  return {};
                };

                return (
                  <motion.div
                    key={section.id}
                    ref={(el) => {
                      cardRefs.current[section.id] = el;
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: section.id === 'services' || section.id === 'projects' ? 0.5 : 0.4,
                      ease: "easeInOut"
                    }}
                    onClick={() => handleCardClick(section, cardRefs.current[section.id])}
                    onMouseLeave={() => {
                      if (section.id === 'news' && isNewsExpanded) {
                        setIsNewsExpanded(false);
                      }
                      if (section.id === 'blog' && isBlogExpanded) {
                        setIsBlogExpanded(false);
                      }
                    }}
                    className={`relative overflow-hidden rounded-lg transition-all duration-300 hover:shadow-2xl w-full cursor-pointer ${
                      (section.id === 'news' && !isNewsExpanded) || (section.id === 'blog' && !isBlogExpanded) ? 'hover:scale-105' : ''
                    }`}
                    style={{
                      height: isExpanded ? 'clamp(450px, 60vh, 650px)' : screenSize.isSmall ? 'clamp(140px, 20vh, 200px)' : 'clamp(200px, 25vh, 280px)',
                      zIndex: isExpanded ? 20 : 'auto',
                      ...getGridStyle(),
                    }}
                  >
                {/* Background - conditional based on section */}
                {section.id === 'about' ? (
                  <div className="absolute inset-0 bg-white" />
                ) : section.id === 'services' || section.id === 'skills' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
                ) : section.id === 'news' || section.id === 'blog' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
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
                      />
                    </div>
                  ) : section.id === 'news' ? (
                    <div className="w-full h-full overflow-hidden">
                      <NewsSection isExpanded={isNewsExpanded} />
                    </div>
                  ) : section.id === 'blog' ? (
                    <div className="w-full h-full overflow-hidden">
                      <BlogSection isExpanded={isBlogExpanded} />
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
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </motion.div>
                );
              })}
            </AnimatePresence>
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
