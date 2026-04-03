// Theme initialization — runs before React hydration to prevent flash.
// Reads palette + mode from localStorage and applies CSS variables.
(function () {
  try {
    var mode = localStorage.getItem('vitalii_color_mode') || 'dark';
    var id = localStorage.getItem('vitalii_active_palette') || 'neutral-dark';
    var isDefault = id === 'neutral-dark' && mode === 'dark';

    // Set data-mode for CSS overrides (text-white inversion etc.)
    if (mode === 'light') {
      document.documentElement.setAttribute('data-mode', 'light');
    }

    if (isDefault) return; // CSS defaults handle neutral-dark

    // Light mode colors for neutral-dark palette
    var neutralLight = {
      '--surface-dark': '245 245 248', '--surface-darker': '238 238 242',
      '--surface-deep': '242 242 246', '--surface-elevated': '255 255 255',
      '--surface-border': '218 218 225', '--surface-border-hover': '195 195 205',
      '--text-primary': '28 28 32', '--text-secondary': '70 68 80',
      '--text-muted': '100 98 115', '--text-faint': '130 127 148',
      '--accent-brand': '10 120 110', '--accent-brand-light': '12 100 92',
      '--accent-brand-lighter': '17 94 89', '--accent-brand-dark': '45 212 191',
      '--accent-brand-darker': '94 234 212',
      '--focus-ring': '13 148 136', '--focus-ring-dark': '15 118 110',
      '--surface-listing': '240 240 244', '--surface-listing-elevated': '248 248 252',
      '--surface-listing-hover': '232 232 238', '--surface-listing-border': '210 210 220',
      '--text-listing-secondary': '80 78 95', '--text-listing-muted': '120 118 135',
      '--particle-color': '150 150 165'
    };

    // Dark mode colors for non-default palettes
    var darkPalettes = {
      'deep-ocean': {
        '--surface-dark': '16 32 50', '--surface-darker': '10 22 36',
        '--surface-deep': '12 26 42', '--surface-elevated': '24 44 65',
        '--surface-border': '35 58 82', '--surface-border-hover': '55 82 110',
        '--text-primary': '226 232 240', '--text-secondary': '186 198 214',
        '--text-muted': '140 160 185', '--text-faint': '100 120 150',
        '--accent-brand': '20 170 200', '--accent-brand-light': '50 220 240',
        '--accent-brand-lighter': '125 211 252', '--accent-brand-dark': '14 116 144',
        '--accent-brand-darker': '22 78 99',
        '--focus-ring': '50 220 240', '--focus-ring-dark': '125 211 252',
        '--surface-listing': '18 35 52', '--surface-listing-elevated': '25 45 65',
        '--surface-listing-hover': '32 55 78', '--surface-listing-border': '40 62 85',
        '--text-listing-secondary': '170 190 210', '--text-listing-muted': '120 145 175',
        '--particle-color': '125 211 252'
      },
      'cyber-neon': {
        '--surface-dark': '12 12 22', '--surface-darker': '6 6 14',
        '--surface-deep': '9 9 18', '--surface-elevated': '22 22 36',
        '--surface-border': '35 35 52', '--surface-border-hover': '55 55 75',
        '--text-primary': '240 253 250', '--text-secondary': '204 251 241',
        '--text-muted': '153 246 228', '--text-faint': '94 190 170',
        '--accent-brand': '34 211 238', '--accent-brand-light': '103 232 249',
        '--accent-brand-lighter': '165 243 252', '--accent-brand-dark': '8 145 178',
        '--accent-brand-darker': '22 78 99',
        '--focus-ring': '103 232 249', '--focus-ring-dark': '165 243 252',
        '--surface-listing': '14 14 22', '--surface-listing-elevated': '22 22 34',
        '--surface-listing-hover': '30 30 44', '--surface-listing-border': '38 38 54',
        '--text-listing-secondary': '190 240 230', '--text-listing-muted': '130 180 170',
        '--particle-color': '103 232 249'
      },
      'midnight-rose': {
        '--surface-dark': '38 22 28', '--surface-darker': '22 12 16',
        '--surface-deep': '30 16 22', '--surface-elevated': '52 34 40',
        '--surface-border': '68 48 55', '--surface-border-hover': '90 68 76',
        '--text-primary': '253 232 239', '--text-secondary': '245 208 220',
        '--text-muted': '210 165 180', '--text-faint': '160 120 135',
        '--accent-brand': '244 63 94', '--accent-brand-light': '251 113 133',
        '--accent-brand-lighter': '253 164 175', '--accent-brand-dark': '225 29 72',
        '--accent-brand-darker': '159 18 57',
        '--focus-ring': '251 113 133', '--focus-ring-dark': '253 164 175',
        '--surface-listing': '32 22 26', '--surface-listing-elevated': '42 30 35',
        '--surface-listing-hover': '52 38 44', '--surface-listing-border': '62 45 52',
        '--text-listing-secondary': '230 200 210', '--text-listing-muted': '180 150 160',
        '--particle-color': '253 164 175'
      }
    };

    var lightPalettes = {
      'deep-ocean': {
        '--surface-dark': '235 245 252', '--surface-darker': '225 238 248',
        '--surface-deep': '230 242 250', '--surface-elevated': '245 252 255',
        '--surface-border': '195 218 238', '--surface-border-hover': '170 198 222',
        '--text-primary': '10 25 42', '--text-secondary': '30 55 82',
        '--text-muted': '65 95 130', '--text-faint': '95 122 155',
        '--accent-brand': '6 115 142', '--accent-brand-light': '10 95 120',
        '--accent-brand-lighter': '22 78 99', '--accent-brand-dark': '34 211 238',
        '--accent-brand-darker': '125 211 252',
        '--focus-ring': '8 145 178', '--focus-ring-dark': '14 116 144',
        '--surface-listing': '230 242 252', '--surface-listing-elevated': '240 248 255',
        '--surface-listing-hover': '218 235 248', '--surface-listing-border': '190 215 235',
        '--text-listing-secondary': '40 65 92', '--text-listing-muted': '90 120 155',
        '--particle-color': '80 160 200'
      },
      'cyber-neon': {
        '--surface-dark': '238 240 248', '--surface-darker': '228 230 242',
        '--surface-deep': '232 234 245', '--surface-elevated': '248 250 255',
        '--surface-border': '200 205 225', '--surface-border-hover': '175 180 205',
        '--text-primary': '8 8 18', '--text-secondary': '25 25 45',
        '--text-muted': '55 55 85', '--text-faint': '85 85 118',
        '--accent-brand': '4 110 138', '--accent-brand-light': '5 90 115',
        '--accent-brand-lighter': '22 78 99', '--accent-brand-dark': '103 232 249',
        '--accent-brand-darker': '165 243 252',
        '--focus-ring': '6 182 212', '--focus-ring-dark': '8 145 178',
        '--surface-listing': '232 234 248', '--surface-listing-elevated': '242 244 255',
        '--surface-listing-hover': '222 225 240', '--surface-listing-border': '195 200 220',
        '--text-listing-secondary': '35 35 60', '--text-listing-muted': '85 85 115',
        '--particle-color': '80 140 180'
      },
      'midnight-rose': {
        '--surface-dark': '252 240 244', '--surface-darker': '248 232 238',
        '--surface-deep': '250 236 242', '--surface-elevated': '255 248 250',
        '--surface-border': '235 210 218', '--surface-border-hover': '220 188 200',
        '--text-primary': '35 18 25', '--text-secondary': '72 40 52',
        '--text-muted': '110 75 90', '--text-faint': '140 105 120',
        '--accent-brand': '190 24 62', '--accent-brand-light': '160 15 52',
        '--accent-brand-lighter': '159 18 57', '--accent-brand-dark': '251 113 133',
        '--accent-brand-darker': '253 164 175',
        '--focus-ring': '225 29 72', '--focus-ring-dark': '190 18 60',
        '--surface-listing': '248 235 240', '--surface-listing-elevated': '252 242 246',
        '--surface-listing-hover': '240 225 232', '--surface-listing-border': '225 205 215',
        '--text-listing-secondary': '60 35 45', '--text-listing-muted': '110 80 92',
        '--particle-color': '220 130 150'
      }
    };

    var colors;
    if (mode === 'light') {
      colors = (id === 'neutral-dark') ? neutralLight : lightPalettes[id];
    } else {
      colors = darkPalettes[id];
    }

    if (!colors) return;
    var s = document.documentElement.style;
    for (var k in colors) s.setProperty(k, colors[k]);
  } catch (e) {}
})();
