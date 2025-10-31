import { useState, useEffect } from 'react';
import { Twitter, Facebook, Send, Instagram, Linkedin, Github, Video, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// TikTok icon component
const TikTokIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

export const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const socialLinks = [
    { icon: Send, href: 'https://t.me/smmshaman', label: 'Telegram', username: '@smmshaman' },
    { icon: Instagram, href: 'https://instagram.com/smmshaman', label: 'Instagram', username: '@smmshaman' },
    { icon: Globe, href: 'https://vitalii.no', label: 'Website', username: 'vitalii.no' },
    { icon: Facebook, href: 'https://facebook.com/SMM.shaman', label: 'Facebook', username: 'SMM.shaman' },
    { icon: Linkedin, href: 'https://linkedin.com/in/smmshaman', label: 'LinkedIn', username: 'smmshaman' },
    { icon: Github, href: 'https://github.com/SmmShaman', label: 'GitHub', username: 'SmmShaman' },
    { icon: Twitter, href: 'https://twitter.com/SmmShaman', label: 'Twitter', username: 'SmmShaman' },
    { icon: TikTokIcon, href: 'https://tiktok.com/@stuardbmw', label: 'TikTok', username: '@stuardbmw' },
    { icon: Video, href: 'https://youtube.com/@SMMShaman', label: 'YouTube', username: 'SMMShaman' },
  ];

  const generateQRCodeUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };

  return (
    <>
      <footer className="h-full w-full px-2 sm:px-4 flex items-center relative">
        <div className="max-w-6xl mx-auto rounded-xl sm:rounded-2xl shadow-2xl border border-black/20 h-full w-full"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div className="h-full flex flex-row items-center justify-between px-3 sm:px-4 md:px-6">
            {/* Clock */}
            <div
              className="text-white/80 font-mono"
              style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.125rem)' }}
            >
              {currentTime.toLocaleTimeString()}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {socialLinks.map(({ icon: Icon, label }) => (
                <motion.button
                  key={label}
                  onClick={() => setSelectedSocial(selectedSocial === label ? null : label)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-white/80 hover:text-white transition-colors duration-300 p-1"
                  aria-label={label}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* QR Code Modal */}
      <AnimatePresence>
        {selectedSocial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSocial(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              {(() => {
                const social = socialLinks.find(s => s.label === selectedSocial);
                if (!social) return null;
                const Icon = social.icon;
                return (
                  <>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                      <h3 className="text-2xl font-bold text-gray-900">{social.label}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                      <img
                        src={generateQRCodeUrl(social.href)}
                        alt={`${social.label} QR Code`}
                        className="w-full h-auto"
                      />
                    </div>
                    <div className="text-center mb-4">
                      <p className="text-gray-600 text-sm mb-2">Scan QR code to visit profile</p>
                      <p className="text-lg font-semibold text-gray-900">{social.username}</p>
                    </div>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 px-4 bg-primary text-white rounded-lg text-center font-medium hover:bg-primary/90 transition-colors"
                    >
                      Open Link
                    </a>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
