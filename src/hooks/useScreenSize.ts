import { useState, useEffect } from 'react';

interface ScreenSize {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  columnsCount: number;
}

export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      width,
      height,
      isSmall: width < 768,
      isMedium: width >= 768 && width < 1024,
      isLarge: width >= 1024 && width < 1536,
      isXLarge: width >= 1536,
      columnsCount: width < 768 ? 1 : width < 1024 ? 2 : width < 1536 ? 3 : width < 2048 ? 4 : 5,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setScreenSize({
        width,
        height,
        isSmall: width < 768,
        isMedium: width >= 768 && width < 1024,
        isLarge: width >= 1024 && width < 1536,
        isXLarge: width >= 1536,
        columnsCount: width < 768 ? 1 : width < 1024 ? 2 : width < 1536 ? 3 : width < 2048 ? 4 : 5,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};
