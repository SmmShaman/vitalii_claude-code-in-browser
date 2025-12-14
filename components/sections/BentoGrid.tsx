'use client'

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useTranslations } from '@/contexts/TranslationContext';
import { SectionDialog } from '@/components/sections/SectionDialog';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { ProjectsCarousel } from '@/components/ui/ProjectsCarousel';
import { ProjectsModal } from '@/components/ui/ProjectsModal';
import { ServicesAnimation } from '@/components/ui/ServicesAnimation';
import { SkillsAnimation } from '@/components/ui/SkillsAnimation';
import { AboutAnimation } from '@/components/ui/AboutAnimation';
import { ServicesDetail } from '@/components/ui/ServicesDetail';
import { NewsSection } from '@/components/sections/NewsSection';
import { BlogSection } from '@/components/sections/BlogSection';
import { NeonVerticalLabel } from '@/components/ui/NeonVerticalLabel';
import { translations } from '@/utils/translations';
import { debugLog } from '@/utils/debug';

// Grid layout constants
const GAP_SIZE = 20; // Fixed gap between windows in pixels (UI design standard: 16-24px)
const COLUMNS_COUNT = 3; // Always 3 columns (fluid width with 1fr)

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
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80&fm=webp',
  },
  {
    id: 'services',
    titleKey: 'services_title',
    contentKey: 'services_content',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fm=webp',
  },
  {
    id: 'projects',
    titleKey: 'projects_title',
    contentKey: 'projects_content',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&fm=webp',
  },
  {
    id: 'skills',
    titleKey: 'skills_title',
    contentKey: 'skills_content',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80&fm=webp',
  },
  {
    id: 'news',
    titleKey: 'news_title',
    contentKey: 'news_description',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80&fm=webp',
  },
  {
    id: 'blog',
    titleKey: 'blog_title',
    contentKey: 'blog_description',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80&fm=webp',
  },
];

interface BentoGridProps {
  onFullscreenChange?: (fullscreen: boolean) => void;
  onHoveredSectionChange?: (sectionId: string | null) => void;
}

// Neon colors for each section - exported for use in background
export const sectionNeonColors: { [key: string]: { primary: string; secondary: string } } = {
  about: { primary: '#AF601A', secondary: '#c97a2e' }, // Насичений коричнево-оранжевий
  services: { primary: '#EC008C', secondary: '#ff33a8' }, // Яскравий фуксієвий рожевий
  projects: { primary: '#009B77', secondary: '#00c49a' }, // Emerald
  skills: { primary: '#955251', secondary: '#b06867' }, // Marsala
  news: { primary: '#88B04B', secondary: '#a3c96a' }, // Greenery
  blog: { primary: '#0F4C81', secondary: '#1a6bb3' }, // Classic Blue
};

export const BentoGrid = ({ onFullscreenChange, onHoveredSectionChange }: BentoGridProps = {}) => {
  const { t, currentLanguage } = useTranslations();
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);
  const [isBlogExpanded, setIsBlogExpanded] = useState(false);
  const [isServicesHiding, setIsServicesHiding] = useState(false);
  const [isProjectsHiding, setIsProjectsHiding] = useState(false);
  const [projectsHeight, setProjectsHeight] = useState<number>(0);
  const [newsHeight, setNewsHeight] = useState<number>(0);
  const [blogHeight, setBlogHeight] = useState<number>(0);
  const [skillsNormalHeight, setSkillsNormalHeight] = useState<number>(0);
  const [blogNormalHeight, setBlogNormalHeight] = useState<number>(0);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [isHidingAllForNews, setIsHidingAllForNews] = useState(false);
  const [isHidingAllForBlog, setIsHidingAllForBlog] = useState(false);
  const [totalGridHeight, setTotalGridHeight] = useState<number>(0);
  const [isSkillsExploding, setIsSkillsExploding] = useState(false);
  const [isAboutExploding, setIsAboutExploding] = useState(false);
  const [isServicesDetailOpen, setIsServicesDetailOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const mouseLeaveTimeoutRef = useRef<number | null>(null);
  const skillsTimeoutRef = useRef<number | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // Use the exported neonColors
  const neonColors = sectionNeonColors;

  // Notify parent when hovered section changes
  useEffect(() => {
    onHoveredSectionChange?.(hoveredSection);
  }, [hoveredSection, onHoveredSectionChange]);

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Log state changes for debugging
  useEffect(() => {
    debugLog('🔔 BentoGrid: isAboutExploding state changed to:', isAboutExploding);
    debugLog('🕐 BentoGrid: Current timestamp:', new Date().toISOString());
  }, [isAboutExploding]);

  useEffect(() => {
    debugLog('🔔 BentoGrid: isSkillsExploding state changed to:', isSkillsExploding);
  }, [isSkillsExploding]);

  const handleAboutClick = () => {
    debugLog('🎯 BentoGrid: handleAboutClick CALLED');
    debugLog('🕐 BentoGrid: Click timestamp:', new Date().toISOString());
    debugLog('📦 BentoGrid: Grid ref:', gridContainerRef.current);
    debugLog('📊 BentoGrid: Current isAboutExploding state:', isAboutExploding);

    // Start explosion animation (no timeout - stays until user closes)
    debugLog('💥 BentoGrid: Setting isAboutExploding = true');
    setIsAboutExploding(true);
    debugLog('✅ BentoGrid: setIsAboutExploding(true) called');
  };

  const handleAboutClose = () => {
    debugLog('❌ BentoGrid: handleAboutClose CALLED');
    debugLog('🕐 BentoGrid: Close timestamp:', new Date().toISOString());
    debugLog('📊 BentoGrid: Current isAboutExploding state before close:', isAboutExploding);
    setIsAboutExploding(false);
    debugLog('✅ BentoGrid: setIsAboutExploding(false) called');
  };

  const handleNewsClick = () => {
    // Don't toggle if a news item is currently selected
    if (selectedNewsId) {
      return;
    }

    if (!isNewsExpanded) {
      // Get heights of all windows
      const servicesEl = cardRefs.current['services'];
      const skillsEl = cardRefs.current['skills'];
      const newsEl = cardRefs.current['news'];
      const blogEl = cardRefs.current['blog'];

      if (servicesEl && skillsEl && newsEl && blogEl) {
        // News expands to: its own height + Services height (takes Services space)
        // News becomes 2x bigger (doubles in height)
        const newsExpandedHeight = servicesEl.offsetHeight + newsEl.offsetHeight;

        setNewsHeight(newsExpandedHeight);

        // Save normal heights of Skills and Blog so they don't stretch when News expands
        setSkillsNormalHeight(skillsEl.offsetHeight);
        setBlogNormalHeight(blogEl.offsetHeight);
      }

      // Start hiding Services first
      setIsServicesHiding(true);

      // After 0.5s, expand News
      setTimeout(() => {
        setIsNewsExpanded(true);
        setIsServicesHiding(false);
      }, 500);
    }
    // News stays expanded - no collapse on repeated clicks
    // User must click another section or scroll to change view
  };

  const handleNewsItemSelect = (newsId: string) => {
    // If News is not expanded yet, expand it first, then select the item
    if (!isNewsExpanded) {
      // First expand News (Services will hide)
      const newsEl = cardRefs.current['news'];
      const servicesEl = cardRefs.current['services'];

      if (newsEl && servicesEl) {
        const newsH = newsEl.offsetHeight;
        setNewsHeight(newsH);
      }

      setIsServicesHiding(true);

      // After 0.5s, News is expanded, now we can select the item
      setTimeout(() => {
        setIsNewsExpanded(true);
        setIsServicesHiding(false);

        // Now select the news item after another 0.5s
        setTimeout(() => {
          selectNewsItem(newsId);
        }, 500);
      }, 500);
    } else {
      // News already expanded, select item immediately
      selectNewsItem(newsId);
    }
  };

  const selectNewsItem = (newsId: string) => {
    debugLog('📰 selectNewsItem CALLED with newsId:', newsId);

    // Update URL with news ID (will be replaced with slug once news data loads)
    window.history.pushState({}, '', `/news/${newsId}`);

    // Calculate heights of all windows for expansion
    const aboutEl = cardRefs.current['about'];
    const servicesEl = cardRefs.current['services'];
    const projectsEl = cardRefs.current['projects'];
    const skillsEl = cardRefs.current['skills'];
    const newsEl = cardRefs.current['news'];
    const blogEl = cardRefs.current['blog'];

    if (aboutEl && servicesEl && projectsEl && skillsEl && newsEl && blogEl) {
      const gapSize = GAP_SIZE;

      // Calculate total height: all 6 windows + 5 gaps (between rows)
      const row1Height = Math.max(aboutEl.offsetHeight, servicesEl.offsetHeight, projectsEl.offsetHeight);
      const row2Height = Math.max(skillsEl.offsetHeight, newsEl.offsetHeight, blogEl.offsetHeight);
      const total = row1Height + row2Height + gapSize;

      setTotalGridHeight(total);
    }

    // Step 1: Hide all other windows
    setIsHidingAllForNews(true);

    // Step 2: After 0.5s, show the selected news (News will expand to fullscreen)
    setTimeout(() => {
      debugLog('✅ setSelectedNewsId CALLED - setting newsId:', newsId);
      setSelectedNewsId(newsId);
      setIsHidingAllForNews(false);
      onFullscreenChange?.(true); // ← Notify parent about fullscreen
      debugLog('✅ Fullscreen change notified (true)');
    }, 500);
  };

  const handleNewsItemBack = () => {
    // Clear URL - return to home
    window.history.pushState({}, '', '/');

    setSelectedNewsId(null);
    setTotalGridHeight(0);
    setIsHidingAllForNews(false);
    onFullscreenChange?.(false); // ← Notify parent about exit fullscreen
    // Keep isNewsExpanded = true so user returns to expanded News list
  };

  const handleBlogItemSelect = (blogId: string) => {
    // If Blog is not expanded yet, expand it first, then select the item
    if (!isBlogExpanded) {
      // First expand Blog (Projects will hide)
      const blogEl = cardRefs.current['blog'];
      const projectsEl = cardRefs.current['projects'];

      if (blogEl && projectsEl) {
        const blogH = blogEl.offsetHeight;
        const projectsH = projectsEl.offsetHeight;
        setBlogHeight(blogH);
        setProjectsHeight(projectsH);
      }

      setIsProjectsHiding(true);

      // After 0.5s, Blog is expanded, now we can select the item
      setTimeout(() => {
        setIsBlogExpanded(true);
        setIsProjectsHiding(false);

        // Now select the blog item after another 0.5s
        setTimeout(() => {
          selectBlogItem(blogId);
        }, 500);
      }, 500);
    } else {
      // Blog already expanded, select item immediately
      selectBlogItem(blogId);
    }
  };

  const selectBlogItem = (blogId: string) => {
    // Calculate heights of all windows for expansion
    const aboutEl = cardRefs.current['about'];
    const servicesEl = cardRefs.current['services'];
    const projectsEl = cardRefs.current['projects'];
    const skillsEl = cardRefs.current['skills'];
    const newsEl = cardRefs.current['news'];
    const blogEl = cardRefs.current['blog'];

    if (aboutEl && servicesEl && projectsEl && skillsEl && newsEl && blogEl) {
      const gapSize = GAP_SIZE;

      // Calculate total height: all 6 windows + 5 gaps (between rows)
      const row1Height = Math.max(aboutEl.offsetHeight, servicesEl.offsetHeight, projectsEl.offsetHeight);
      const row2Height = Math.max(skillsEl.offsetHeight, newsEl.offsetHeight, blogEl.offsetHeight);
      const total = row1Height + row2Height + gapSize;

      setTotalGridHeight(total);
    }

    // Step 1: Hide all other windows
    setIsHidingAllForBlog(true);

    // Step 2: After 0.5s, show the selected blog (Blog will expand to fullscreen)
    setTimeout(() => {
      setSelectedBlogId(blogId);
      setIsHidingAllForBlog(false);
      onFullscreenChange?.(true); // ← Notify parent about fullscreen
    }, 500);
  };

  const handleBlogItemBack = () => {
    setSelectedBlogId(null);
    setTotalGridHeight(0);
    setIsHidingAllForBlog(false);
    onFullscreenChange?.(false); // ← Notify parent about exit fullscreen
    // Keep isBlogExpanded = true so user returns to expanded Blog list
  };

  const handleBlogClick = () => {
    debugLog('🔴 handleBlogClick викликано, поточний стан:', {
      isBlogExpanded,
      selectedBlogId,
      isProjectsHiding,
    });

    // Don't toggle if a blog item is currently selected
    if (selectedBlogId) {
      debugLog('⚠️ Blog item вибраний, ігноруємо клік');
      return;
    }

    if (!isBlogExpanded) {
      debugLog('🟢 Розширюємо Blog...');
      // Get both Blog and Projects heights before animation
      const blogEl = cardRefs.current['blog'];
      const projectsEl = cardRefs.current['projects'];

      if (blogEl && projectsEl) {
        const blogH = blogEl.offsetHeight;
        const projectsH = projectsEl.offsetHeight;
        debugLog('📏 Blog висота:', blogH, 'Projects висота:', projectsH);
        setBlogHeight(blogH);
        setProjectsHeight(projectsH);
      }

      // Start hiding Projects first
      debugLog('🟡 Починаємо ховати Projects (setIsProjectsHiding(true))');
      setIsProjectsHiding(true);
      // After 0.5s, expand Blog
      setTimeout(() => {
        debugLog('🟢 Розширюємо Blog зараз (setIsBlogExpanded(true))');
        setIsBlogExpanded(true);
        setIsProjectsHiding(false);
      }, 500);
    } else {
      debugLog('🔵 Згортаємо Blog...');
      setIsBlogExpanded(false);
      setProjectsHeight(0);
      setBlogHeight(0);
      setSelectedBlogId(null);
      setIsHidingAllForBlog(false);
      setTotalGridHeight(0);
      onFullscreenChange?.(false); // ← Notify parent about exit fullscreen
    }
  };

  const handleSkillsClick = () => {
    debugLog('🎯 Skills clicked! Starting explosion animation');
    debugLog('📦 Grid ref:', gridContainerRef.current);

    // Clear any existing timeout
    if (skillsTimeoutRef.current) {
      debugLog('⏱️ Clearing existing timeout');
      clearTimeout(skillsTimeoutRef.current);
      skillsTimeoutRef.current = null;
    }

    // Start explosion animation
    debugLog('💥 Setting isSkillsExploding = true');
    setIsSkillsExploding(true);

    // After 5 seconds, return to normal
    skillsTimeoutRef.current = window.setTimeout(() => {
      debugLog('⏰ 5 seconds elapsed, returning to normal');
      setIsSkillsExploding(false);
      skillsTimeoutRef.current = null;
    }, 5000);
  };

  const handleServicesClick = () => {
    debugLog('🎯 Services clicked! Opening detail view');
    setIsServicesDetailOpen(true);
    onFullscreenChange?.(true);
  };

  const handleServicesDetailClose = () => {
    debugLog('❌ Services detail closed');
    setIsServicesDetailOpen(false);
    onFullscreenChange?.(false);
  };

  const handleCardClick = (section: Section, cardElement: HTMLDivElement | null) => {
    if (!cardElement) return;

    // Don't open dialog for sections that have their own modals
    if (section.id === 'projects') return;

    // Handle about explosion animation
    if (section.id === 'about') {
      handleAboutClick();
      return;
    }

    // Handle services detail view
    if (section.id === 'services') {
      handleServicesClick();
      return;
    }

    // Handle news expansion separately
    if (section.id === 'news') {
      // Only toggle if not expanded or if no news item is selected
      // If news is expanded and showing a news item, don't toggle
      if (!isNewsExpanded || !selectedNewsId) {
        handleNewsClick();
      }
      return;
    }

    // Handle blog expansion separately
    if (section.id === 'blog') {
      // Only toggle if not expanded or if no blog item is selected
      // If blog is expanded and showing a blog item, don't toggle
      if (!isBlogExpanded || !selectedBlogId) {
        handleBlogClick();
      }
      return;
    }

    // Handle skills explosion animation
    if (section.id === 'skills') {
      handleSkillsClick();
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
            cardElement.style.removeProperty('height');
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
      <div className={`h-full w-full ${selectedNewsId || selectedBlogId ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} flex items-start justify-start`}>
        <div className="flex flex-col w-full h-full p-5">
          <LayoutGroup>
            <div
              ref={gridContainerRef}
              className="grid relative w-full h-full"
              style={{
                gridTemplateColumns: isMobile ? '1fr' : `repeat(${COLUMNS_COUNT}, 1fr)`,
                gridTemplateRows: isMobile ? 'auto' : `repeat(2, 1fr)`,
                gap: `${GAP_SIZE}px`,
              }}
            >
              <AnimatePresence mode="sync">
                {sections
                  // ФІЛЬТРУЄМО Services коли News розширюється
                  .filter((section) => {
                    // Ховаємо Services коли News розширений
                    if (section.id === 'services' && (isServicesHiding || isNewsExpanded)) {
                      debugLog('🚫 FILTER: Services ВИДАЛЕНО з DOM');
                      return false;
                    }
                    // Ховаємо Projects коли Blog розширений
                    if (section.id === 'projects' && (isProjectsHiding || isBlogExpanded)) {
                      debugLog('🚫 FILTER: Projects ВИДАЛЕНО з DOM');
                      return false;
                    }
                    debugLog('✅ FILTER: ', section.id, 'залишається в DOM');
                    return true;
                  })
                  .map((section) => {
                // Calculate expanded height: original + target + gap
                const getExpandedHeight = () => {
                  // Fixed gap for uniform spacing on all screen sizes
                  const gapSize = GAP_SIZE;

                  // Mobile: use fixed minimum height for each section to allow scrolling
                  if (isMobile) {
                    // Fullscreen mode for news/blog items
                    if ((section.id === 'news' && selectedNewsId) || (section.id === 'blog' && selectedBlogId)) {
                      return '100vh';
                    }
                    // Default minimum height for mobile sections
                    return '60vh';
                  }

                  // Desktop logic below (unchanged)
                  // News: full grid height when news item selected
                  if (section.id === 'news' && selectedNewsId && totalGridHeight > 0) {
                    return `${totalGridHeight}px`;
                  }

                  // Blog: full grid height when blog item selected
                  if (section.id === 'blog' && selectedBlogId && totalGridHeight > 0) {
                    return `${totalGridHeight}px`;
                  }

                  // News: expanded height when just News section expanded
                  // newsHeight already contains: Services height + News normal height
                  if (section.id === 'news' && isNewsExpanded && newsHeight > 0) {
                    return `${newsHeight}px`;
                  }

                  // Blog: expanded height when just Blog section expanded
                  if (section.id === 'blog' && isBlogExpanded && blogHeight > 0 && projectsHeight > 0) {
                    const totalHeight = blogHeight + projectsHeight + gapSize;
                    return `${totalHeight}px`;
                  }

                  // Skills: fixed height when News is expanded (don't stretch!)
                  if (section.id === 'skills' && isNewsExpanded && skillsNormalHeight > 0) {
                    return `${skillsNormalHeight}px`;
                  }

                  // Blog: fixed height when News is expanded (don't stretch!)
                  if (section.id === 'blog' && isNewsExpanded && !isBlogExpanded && blogNormalHeight > 0) {
                    return `${blogNormalHeight}px`;
                  }

                  // Skills: normal height - same as other windows (News, Blog)
                  // Skills uses explosion animation, not height expansion
                  return '100%';
                };

                // Get animated properties for each section
                const getAnimatedProps = () => {
                  debugLog(`🎬 getAnimatedProps для ${section.id}:`, {
                    isSkillsExploding,
                    isServicesDetailOpen,
                    selectedNewsId,
                    selectedBlogId,
                    isNewsExpanded,
                    isBlogExpanded,
                    isHidingAllForNews,
                    isHidingAllForBlog,
                  });

                  // Hide ALL 6 windows when Skills is exploding (logos will show on top)
                  if (isSkillsExploding) {
                    debugLog(`💥 ${section.id}: Skills exploding - opacity: 0`);
                    return {
                      opacity: 0,
                      scale: 0.95,
                    };
                  }

                  // Hide ALL 6 windows when About is exploding (text will show on top)
                  if (isAboutExploding) {
                    debugLog(`💥 ${section.id}: About exploding - opacity: 0`);
                    return {
                      opacity: 0,
                      scale: 0.95,
                    };
                  }

                  // Hide ALL 6 windows when Services detail is open
                  if (isServicesDetailOpen) {
                    debugLog(`📋 ${section.id}: Services detail open - opacity: 0`);
                    return {
                      opacity: 0,
                      scale: 0.95,
                    };
                  }

                  // ====== LOCK УМОВИ - ЗАВЖДИ ПЕРШИМИ! ======

                  // Skills: НІКОЛИ не рухається - ПЕРША УМОВА!
                  if (section.id === 'skills' && !selectedNewsId && !selectedBlogId) {
                    debugLog(`🔒 Skills LOCK спрацював: opacity: 1, y: 0`);
                    return { opacity: 1, y: 0, scaleY: 1 };
                  }

                  // News: НІКОЛИ не рухається (окрім fullscreen)
                  if (section.id === 'news' && !selectedNewsId && !selectedBlogId) {
                    debugLog(`🔒 News LOCK спрацював: opacity: 1, y: 0`);
                    return { opacity: 1, y: 0, scaleY: 1 };
                  }

                  // Blog: НЕ рухається ОКРІМ коли сам розширений (тоді піднімається вгору)
                  if (section.id === 'blog' && !selectedNewsId && !selectedBlogId && !isBlogExpanded) {
                    debugLog(`🔒 Blog LOCK спрацював: opacity: 1, y: 0`);
                    return { opacity: 1, y: 0, scaleY: 1 };
                  }

                  // About: ЗАВЖДИ видимий, окрім fullscreen режимів (БЕЗ перевірки isHidingAllForNews!)
                  if (section.id === 'about' && !selectedNewsId && !selectedBlogId) {
                    debugLog(`🔒 About LOCK спрацював: opacity: 1, y: 0`);
                    return { opacity: 1, y: 0, scaleY: 1 };
                  }

                  // Projects: ЗАВЖДИ видимий, окрім fullscreen режимів (БЕЗ перевірки isHidingAllForNews!)
                  if (section.id === 'projects' && !selectedNewsId && !selectedBlogId) {
                    debugLog(`🔒 Projects LOCK спрацював: opacity: 1, y: 0`);
                    return { opacity: 1, y: 0, scaleY: 1 };
                  }

                  // ====== РЕШТА УМОВ ======

                  // Hide all windows except News when news item is being selected
                  if (section.id !== 'news' && (isHidingAllForNews || selectedNewsId)) {
                    debugLog(`❌ ${section.id}: HIDING для News fullscreen - opacity: 0`);
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // Hide all windows except Blog when blog item is being selected
                  if (section.id !== 'blog' && (isHidingAllForBlog || selectedBlogId)) {
                    debugLog(`❌ ${section.id}: HIDING для Blog fullscreen - opacity: 0`);
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // Services: scale to 0 height when hiding (0fr grid trick)
                  if (section.id === 'services' && (isServicesHiding || isNewsExpanded)) {
                    debugLog(`❌ Services: HIDING (News розширений) - opacity: 0`);
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // Projects: scale to 0 height when hiding
                  if (section.id === 'projects' && (isProjectsHiding || isBlogExpanded)) {
                    debugLog(`❌ Projects: HIDING (Blog розширений) - opacity: 0`);
                    return {
                      opacity: 0,
                      scaleY: 0,
                      transformOrigin: 'top',
                    };
                  }

                  // News: fullscreen mode - reset transform when news item is selected
                  if (section.id === 'news' && selectedNewsId) {
                    debugLog(`📰 News FULLSCREEN: opacity: 1`);
                    return {
                      opacity: 1,
                      y: 0,
                    };
                  }

                  // News: НЕ рухається вгору, просто стає вищим на своєму місці
                  if (section.id === 'news' && isNewsExpanded) {
                    debugLog(`📰 News РОЗШИРЕНИЙ: opacity: 1, y: 0`);
                    return {
                      opacity: 1,
                      y: 0,  // Залишається на місці, НЕ рухається вгору!
                    };
                  }

                  // Blog: fullscreen mode - reset transform when blog item is selected
                  if (section.id === 'blog' && selectedBlogId) {
                    debugLog(`📝 Blog FULLSCREEN: opacity: 1`);
                    return {
                      opacity: 1,
                      y: 0,
                    };
                  }

                  // Blog: піднімається вгору на місце Projects коли розширений
                  if (section.id === 'blog' && isBlogExpanded) {
                    debugLog(`📝 Blog РОЗШИРЕНИЙ (піднімається вгору): opacity: 1, y: 0`);
                    return {
                      opacity: 1,
                      y: 0,  // Grid position change handled by gridRow, не потрібен y transform
                    };
                  }

                  debugLog(`✨ ${section.id}: DEFAULT стан - opacity: 1, y: 0`);
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
                      debugLog(`🐭 MOUSE ENTER: ${section.id}`);
                      setHoveredSection(section.id);
                      // Cancel collapse timeout ONLY if mouse returns to the SAME expanded window
                      if (mouseLeaveTimeoutRef.current) {
                        // Only cancel if returning to News when News is expanded
                        if (section.id === 'news' && isNewsExpanded) {
                          debugLog(`⏹️ СКАСОВАНО таймер - курсор повернувся в News`);
                          clearTimeout(mouseLeaveTimeoutRef.current);
                          mouseLeaveTimeoutRef.current = null;
                        }
                        // Only cancel if returning to Blog when Blog is expanded
                        else if (section.id === 'blog' && isBlogExpanded) {
                          debugLog(`⏹️ СКАСОВАНО таймер - курсор повернувся в Blog`);
                          clearTimeout(mouseLeaveTimeoutRef.current);
                          mouseLeaveTimeoutRef.current = null;
                        }
                        // Do NOT cancel if entering other windows
                        else {
                          debugLog(`⚠️ НЕ скасовуємо таймер - це інше вікно (${section.id})`);
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      debugLog(`🐭 MOUSE LEAVE: ${section.id}`, {
                        isNewsExpanded,
                        isBlogExpanded,
                        isServicesHiding,
                        isProjectsHiding,
                        selectedNewsId,
                        selectedBlogId,
                      });
                      setHoveredSection(null);

                      // News/Blog: longer timeout to prevent accidental collapse
                      // Give user time to move cursor around the expanded window
                      if (section.id === 'news' && isNewsExpanded && !isServicesHiding && !selectedNewsId) {
                        debugLog(`⏰ NEWS: Встановлюю таймер згортання (1.5s)`);
                        mouseLeaveTimeoutRef.current = window.setTimeout(() => {
                          debugLog(`✅ NEWS: Таймер спрацював - згортаю News`);
                          setIsNewsExpanded(false);
                          setNewsHeight(0);
                          setSkillsNormalHeight(0);
                          setBlogNormalHeight(0);
                          mouseLeaveTimeoutRef.current = null;
                        }, 1500);  // 1.5 seconds - stable, won't collapse accidentally
                      } else if (section.id === 'news') {
                        debugLog(`❌ NEWS: Умова НЕ виконалась - таймер НЕ встановлено`);
                      }

                      if (section.id === 'blog' && isBlogExpanded && !isProjectsHiding && !selectedBlogId) {
                        debugLog(`⏰ BLOG: Встановлюю таймер згортання (1.5s)`);
                        mouseLeaveTimeoutRef.current = window.setTimeout(() => {
                          debugLog(`✅ BLOG: Таймер спрацював - згортаю Blog`);
                          setIsBlogExpanded(false);
                          setBlogHeight(0);
                          setProjectsHeight(0);
                          mouseLeaveTimeoutRef.current = null;
                        }, 1500);  // 1.5 seconds - stable, won't collapse accidentally
                      } else if (section.id === 'blog') {
                        debugLog(`❌ BLOG: Умова НЕ виконалась - таймер НЕ встановлено`);
                      }
                    }}
                    className={`relative rounded-lg transition-all duration-300 hover:shadow-2xl w-full cursor-pointer ${
                      (section.id === 'news' && !isNewsExpanded) || (section.id === 'blog' && !isBlogExpanded) ? 'hover:scale-105' : ''
                    } ${
                      // Allow scroll when news/blog item is selected, otherwise hide overflow
                      (section.id === 'news' && selectedNewsId) || (section.id === 'blog' && selectedBlogId)
                        ? 'overflow-y-auto overflow-x-hidden'
                        : 'overflow-hidden'
                    }`}
                    style={{
                      height: getExpandedHeight(),
                      willChange: 'transform',
                      // ЯВНІ grid positions щоб вікна залишалися на місцях
                      // Row 1: About(1,1), Services(2,1), Projects(3,1)
                      // Row 2: Skills(1,2), News(2,2), Blog(3,2)
                      // ВИНЯТОК: News та Blog займають ОБИДВА ряди (1-2) коли розширені
                      // On mobile: all sections use auto positioning to stack vertically
                      gridColumn: isMobile ? 'auto' : (
                                  section.id === 'about' ? '1' :
                                  section.id === 'services' ? '2' :
                                  section.id === 'projects' ? '3' :
                                  section.id === 'skills' ? '1' :
                                  section.id === 'news' ? '2' :
                                  section.id === 'blog' ? '3' : 'auto'
                      ),
                      gridRow: isMobile ? 'auto' : (
                               section.id === 'about' || section.id === 'services' || section.id === 'projects' ? '1' :
                               section.id === 'news' && isNewsExpanded ? '1 / 3' : // News займає ряди 1-2 (обидва ряди)
                               section.id === 'blog' && isBlogExpanded ? '1 / 3' : // Blog займає ряди 1-2 (обидва ряди)
                               '2'
                      ),
                      // Expand to full grid when news/blog item is selected (override positions)
                      ...(section.id === 'news' && selectedNewsId ? {
                        gridColumn: '1 / -1',
                        gridRow: '1 / -1'
                      } : {}),
                      ...(section.id === 'blog' && selectedBlogId ? {
                        gridColumn: '1 / -1',
                        gridRow: '1 / -1'
                      } : {}),
                    }}
                  >
                {/* Background - conditional based on section */}
                {section.id === 'about' || section.id === 'services' || section.id === 'skills' ? (
                  <div className="absolute inset-0 bg-white" />
                ) : section.id === 'news' || section.id === 'blog' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
                ) : section.id === 'projects' ? (
                  <>
                    {/* White background layer - bottom */}
                    <div className="absolute inset-0 bg-white/85 z-0" />
                    {/* Project image layer - middle */}
                    <div
                      className="absolute inset-0 bg-no-repeat bg-right transition-all duration-500 z-10"
                      style={{
                        backgroundImage: `url(${currentProjectImage})`,
                        backgroundSize: '70%',
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 bg-no-repeat bg-cover bg-center transition-all duration-500"
                    style={{
                      backgroundImage: `url(${section.image})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                  </div>
                )}

                {/* Neon Vertical Label */}
                <NeonVerticalLabel
                  text={t(section.titleKey as any) as string}
                  isDarkBackground={section.id === 'projects' || section.id === 'testimonials' || section.id === 'contact'}
                  currentLanguage={currentLanguage}
                  isHovered={hoveredSection === section.id}
                  neonColor={neonColors[section.id]}
                />

                {/* Content */}
                <div className={`relative h-full max-h-full flex items-start justify-center z-30 ${
                  section.id === 'about'
                    ? 'p-4 pl-12 sm:p-5 sm:pl-14 md:p-6 md:pl-16'
                    : 'p-4 pl-12 sm:p-5 sm:pl-14 md:p-6 md:pl-16'
                } overflow-hidden`}>
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
                        key={currentLanguage} // Force re-render on language change
                        services={translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].services_list}
                        backgroundText={t('services_title') as string}
                        currentLanguage={currentLanguage}
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
                      <BlogSection
                        isExpanded={isBlogExpanded}
                        selectedBlogId={selectedBlogId}
                        onBlogSelect={handleBlogItemSelect}
                        onBack={handleBlogItemBack}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Services Detail - renders inside grid */}
            <ServicesDetail
              services={translations[currentLanguage.toLowerCase() as 'en' | 'no' | 'ua'].services_list}
              isOpen={isServicesDetailOpen}
              onClose={handleServicesDetailClose}
              gridContainerRef={gridContainerRef}
            />
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

      {/* About Animation */}
      <AboutAnimation
        text={t('about_content') as string}
        isExploding={isAboutExploding}
        gridContainerRef={gridContainerRef}
        onClose={handleAboutClose}
      />
    </>
  );
};
