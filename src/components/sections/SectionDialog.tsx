import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { ContactForm } from './ContactForm';

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  image: string;
  sectionId: string;
}

export const SectionDialog = ({
  open,
  onOpenChange,
  title,
  content,
  image,
  sectionId,
}: SectionDialogProps) => {
  const isContact = sectionId === 'contact';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-4xl rounded-[2rem] shadow-2xl"
          style={{
            height: 'calc(100vh - 33.3vh)',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
          }}
        >
          <div className="flex h-full overflow-hidden rounded-[2rem]">
            {/* Left side - Image */}
            <div className="relative w-1/3 overflow-hidden group">
              <div
                className="absolute inset-0 bg-cover bg-center animate-slide-right transition-transform duration-300 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${image})`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              </div>
            </div>

            {/* Right side - Content */}
            <div className="flex-1 flex flex-col p-8">
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-3xl font-bold text-white">
                  {title}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    className="absolute top-6 right-6 rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </Dialog.Close>
              </div>

              <ScrollArea.Root className="flex-1 overflow-hidden">
                <ScrollArea.Viewport className="w-full h-full">
                  {isContact ? (
                    <ContactForm />
                  ) : (
                    <div className="text-lg text-white/90 leading-relaxed pr-4">
                      {content}
                    </div>
                  )}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  className="flex select-none touch-none p-0.5 bg-white/10 transition-colors duration-150 ease-out hover:bg-white/20 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                  orientation="vertical"
                >
                  <ScrollArea.Thumb className="flex-1 bg-white/50 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
