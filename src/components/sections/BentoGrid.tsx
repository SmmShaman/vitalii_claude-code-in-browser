import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from '../../contexts/TranslationContext';
import { SectionDialog } from './SectionDialog';
import { TypewriterText } from '../ui/TypewriterText';

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
  const { t } = useTranslations();
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleCardClick = (section: Section, cardElement: HTMLDivElement | null) => {
    if (!cardElement) return;

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

  return (
    <>
      <div className="container mx-auto px-4 flex items-center justify-center"
        style={{ height: 'calc(100vh - 33.3vh)' }}
      >
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                ref={(el) => {
                  cardRefs.current[section.id] = el;
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => handleCardClick(section, cardRefs.current[section.id])}
                className="relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  height: 'calc((100vh - 33.3vh - 4rem) / 2)',
                  minHeight: '200px',
                }}
              >
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300"
                  style={{
                    backgroundImage: `url(${section.image})`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/40" />
                </div>

                {/* Content */}
                <div className="relative h-full flex items-start justify-center p-6 overflow-hidden">
                  {section.id === 'about' ? (
                    <div className="w-full h-full overflow-hidden">
                      <TypewriterText
                        text={t(section.contentKey as any)}
                        speed={30}
                        className="h-full max-h-full"
                      />
                    </div>
                  ) : (
                    <h3 className="text-3xl md:text-4xl font-bold text-white text-center drop-shadow-lg self-center">
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
    </>
  );
};
