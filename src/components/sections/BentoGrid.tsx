import { useState, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
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
  const [servicesHeight, setServicesHeight] = useState<number>(0);
  const [projectsHeight, setProjectsHeight] = useState<number>(0);
  const [newsHeight, setNewsHeight] = useState<number>(0);
  const [blogHeight, setBlogHeight] = useState<number>(0);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const mouseLeaveTimeoutRef = useRef<number | null>(null);

  const handleNewsClick = () => {
    console.log('🔴 handleNewsClick called, current isNewsExpanded:', isNewsExpanded);
    if (!isNewsExpanded) {
      // Get both News and Services heights before animation
      const newsEl = cardRefs.current['news'];
      const servicesEl = cardRefs.current['services'];

      if (newsEl && servicesEl) {
        const newsH = newsEl.offsetHeight;
        const servicesH = servicesEl.offsetHeight;
        console.log('📏 News height:', newsH, 'Services height:', servicesH);
        setNewsHeight(newsH);
        setServicesHeight(servicesH);
      }

      // Start hiding Services first
      console.log('🟡 Starting Services hide animation');
      setIsServicesHiding(true);

      // After 0.5s, expand News
      setTimeout(() => {
        console.log('🟢 Expanding News now');
        setIsNewsExpanded(true);
        setIsServicesHiding(false);
      }, 500);
    } else {
      console.log('🔵 Collapsing News');
      setIsNewsExpanded(false);
      setServicesHeight(0);
      setNewsHeight(0);
      setSelectedNewsId(null); // Reset selected news when collapsing
    }
  };

  const handleNewsItemSelect = (newsId: string) => {
    console.log('📰 News item selected:', newsId);
    setSelectedNewsId(newsId);
  };

  const handleNewsItemBack = () => {
    console.log('🔙 Back to news list');
    setSelectedNewsId(null);
  };

  const handleBlogClick = () => {
    if (!isBlogExpanded) {
      // Get both Blog and Projects heights before animation
      const blogEl = cardRefs.current['blog'];
      const projectsEl = cardRefs.current['projects'];

      if (blogEl && projectsEl) {
        const blogH = blogEl.offsetHeight;
        const projectsH = projectsEl.offsetHeight;
        console.log('📏 Blog height:', blogH, 'Projects height:', projectsH);
        setBlogHeight(blogH);
        setProjectsHeight(projectsH);
      }

      // Start hiding Projects first
      setIsProjectsHiding(true);
      // After 0.5s, expand Blog
      setTimeout(() => {
        setIsBlogExpanded(true);
        setIsProjectsHiding(false);
      }, 500);
    } else {
      setIsBlogExpanded(false);
      setProjectsHeight(0);
      setBlogHeight(0);
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

          <LayoutGroup>
            <div
              ref={gridContainerRef}
              className="grid gap-2 sm:gap-3 md:gap-4 w-full relative"
              style={{
                gridTemplateColumns: `repeat(${screenSize.columnsCount}, 1fr)`,
                gridAutoRows: screenSize.isSmall ? 'clamp(140px, 20vh, 200px)' : 'clamp(200px, 25vh, 280px)',
              }}
            >
              <AnimatePresence mode="sync">
                {sections.map((section) => {
                const isExpanded =
                  (section.id === 'news' && isNewsExpanded) ||
                  (section.id === 'blog' && isBlogExpanded);

                // Calculate expanded height: original + target + gap
                const getExpandedHeight = () => {
                  // Gap depends on screen size: gap-2 (8px) / gap-3 (12px) / gap-4 (16px)
                  const gapSize = screenSize.isSmall ? 8 : screenSize.columnsCount < 3 ? 12 : 16;

                  if (section.id === 'news' && isNewsExpanded && newsHeight > 0 && servicesHeight > 0) {
                    const totalHeight = newsHeight + servicesHeight + gapSize;
                    console.log('📐 News expanded height:', totalHeight, '=', newsHeight, '+', servicesHeight, '+', gapSize);
                    return `${totalHeight}px`;
                  }

                  if (section.id === 'blog' && isBlogExpanded && blogHeight > 0 && projectsHeight > 0) {
                    const totalHeight = blogHeight + projectsHeight + gapSize;
                    console.log('📐 Blog expanded height:', totalHeight, '=', blogHeight, '+', projectsHeight, '+', gapSize);
                    return `${totalHeight}px`;
                  }

                  return screenSize.isSmall ? 'clamp(140px, 20vh, 200px)' : 'clamp(200px, 25vh, 280px)';
                };

                if (section.id === 'news') {
                  console.log(`📰 Rendering NEWS - isExpanded: ${isExpanded}, isNewsExpanded: ${isNewsExpanded}, width: SAME (1 column), height: ${isExpanded ? 'EXPANDED' : 'normal'}`);
                }

                // Get animated properties for each section
                const getAnimatedProps = () => {
                  // Gap depends on screen size: gap-2 (8px) / gap-3 (12px) / gap-4 (16px)
                  const gapSize = screenSize.isSmall ? 8 : screenSize.columnsCount < 3 ? 12 : 16;

                  // Services: scale to 0 height when hiding (0fr grid trick)
                  if (section.id === 'services' && (isServicesHiding || isNewsExpanded)) {
                    console.log('🎬 Animating Services scaleY to 0');
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // Skills: scale to 0 when news item is selected (dissolve to free space)
                  if (section.id === 'skills' && selectedNewsId) {
                    console.log('🎬 Animating Skills scaleY to 0 (news item selected)');
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // Blog: scale to 0 when news item is selected (dissolve to free space)
                  if (section.id === 'blog' && selectedNewsId) {
                    console.log('🎬 Animating Blog scaleY to 0 (news item selected)');
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // Projects: scale to 0 height when hiding
                  if (section.id === 'projects' && (isProjectsHiding || isBlogExpanded)) {
                    console.log('🎬 Animating Projects scaleY to 0');
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // News: move upward by Services height when expanded
                  if (section.id === 'news' && isNewsExpanded && servicesHeight > 0) {
                    const moveDistance = -(servicesHeight + gapSize);
                    console.log('🎬 Animating News translateY to', moveDistance);
                    return {
                      opacity: 1,
                      y: moveDistance,
                    };
                  }

                  // Blog: move upward by Projects height when expanded
                  if (section.id === 'blog' && isBlogExpanded && projectsHeight > 0) {
                    const moveDistance = -(projectsHeight + gapSize);
                    console.log('🎬 Animating Blog translateY to', moveDistance);
                    return {
                      opacity: 1,
                      y: moveDistance,
                    };
                  }

                  return {
                    opacity: 1,
                    y: 0,
                  };
                };

                return (
                  <motion.div
                    key={section.id}
                    ref={(el) => {
                      cardRefs.current[section.id] = el;
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={getAnimatedProps()}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.5,
                      ease: "easeInOut",
                    }}
                    onClick={() => handleCardClick(section, cardRefs.current[section.id])}
                    onMouseEnter={() => {
                      // Cancel collapse timeout if mouse returns
                      if (mouseLeaveTimeoutRef.current) {
                        clearTimeout(mouseLeaveTimeoutRef.current);
                        mouseLeaveTimeoutRef.current = null;
                        console.log('🐭 Mouse returned, cancel collapse');
                      }
                    }}
                    onMouseLeave={() => {
                      // Delay collapse by 300ms to avoid accidental triggers
                      // Don't collapse if a news item is selected
                      if (section.id === 'news' && isNewsExpanded && !isServicesHiding && !selectedNewsId) {
                        console.log('🖱️ Mouse left News, will collapse in 300ms');
                        mouseLeaveTimeoutRef.current = window.setTimeout(() => {
                          console.log('⏰ Collapsing News now');
                          setIsNewsExpanded(false);
                          mouseLeaveTimeoutRef.current = null;
                        }, 300);
                      }
                      if (section.id === 'blog' && isBlogExpanded && !isProjectsHiding) {
                        mouseLeaveTimeoutRef.current = window.setTimeout(() => {
                          setIsBlogExpanded(false);
                          mouseLeaveTimeoutRef.current = null;
                        }, 300);
                      }
                    }}
                    className={`relative overflow-hidden rounded-lg transition-all duration-300 hover:shadow-2xl w-full cursor-pointer ${
                      (section.id === 'news' && !isNewsExpanded) || (section.id === 'blog' && !isBlogExpanded) ? 'hover:scale-105' : ''
                    }`}
                    style={{
                      height: getExpandedHeight(),
                      // Expand to full width when news item is selected
                      ...(section.id === 'news' && selectedNewsId ? { gridColumn: '1 / -1' } : {}),
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
                      <NewsSection
                        isExpanded={isNewsExpanded}
                        selectedNewsId={selectedNewsId}
                        onNewsSelect={handleNewsItemSelect}
                        onBack={handleNewsItemBack}
                      />
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
        </LayoutGroup>
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
