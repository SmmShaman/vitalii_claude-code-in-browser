import { useState, useEffect } from 'react';
import { Twitter, Facebook, Send, Instagram, Linkedin } from 'lucide-react';

export const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Send, href: 'https://t.me', label: 'Telegram' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 mb-2 sm:mb-4 px-2 sm:px-4">
      <div className="max-w-6xl mx-auto rounded-xl sm:rounded-[2rem] shadow-2xl border border-black/20"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="flex flex-row items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4"
          style={{
            minHeight: '50px',
            maxHeight: '80px',
          }}
        >
          {/* Clock */}
          <div className="text-white/80 text-sm sm:text-base md:text-lg lg:text-xl font-mono">
            {currentTime.toLocaleTimeString()}
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label={label}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
