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
    <footer className="fixed bottom-0 left-0 right-0 z-40 mb-4 px-4">
      <div className="max-w-6xl mx-auto rounded-[2rem] shadow-2xl border border-black/20"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          backdropFilter: 'blur(2px)',
          height: '11.1vh',
        }}
      >
        <div className="h-full flex flex-col md:flex-row items-center justify-between px-6 md:px-8 py-4">
          {/* Clock */}
          <div className="text-white/80 text-lg md:text-xl font-mono mb-2 md:mb-0">
            {currentTime.toLocaleTimeString()}
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label={label}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
