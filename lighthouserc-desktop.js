// Lighthouse CI configuration — Desktop
module.exports = {
  ci: {
    collect: {
      url: [
        'https://vitalii.no/',
        'https://vitalii.no/blog',
        'https://vitalii.no/news',
      ],
      numberOfRuns: 3,
      settings: {
        // Desktop preset: no throttling, desktop viewport
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
