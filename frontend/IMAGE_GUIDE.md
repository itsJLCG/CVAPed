# How to Add Images to CVACare Landing Page

## Step-by-Step Guide

### 1. Add Your Images to the Assets Folder

Place your images in `frontend/src/assets/` folder:

- `logo.png` - Main CVACare logo
- `cvacare-text.png` - CVACare brand text image
- `web-system.png` - Web application screenshot
- `CVACare_Android.jpg` - Mobile app screenshot
- `tup-logo.png` - TUP logo
- `i-love-taguig.png` - I Love Taguig logo
- `taguig-pru.png` - Taguig Physical Rehabilitation Unit logo

### 2. Update the images.js File

Open `frontend/src/assets/images.js` and import your images:

```javascript
// Import your images
import logo from './logo.png';
import cvacareText from './cvacare-text.png';
import webSystem from './web-system.png';
import mobileApp from './CVACare_Android.jpg';
import tupLogo from './tup-logo.png';
import iLoveTaguig from './i-love-taguig.png';
import taguigPRU from './taguig-pru.png';

export const images = {
  logo: logo,
  cvacareText: cvacareText,
  webSystem: webSystem,
  mobileApp: mobileApp,
  tupLogo: tupLogo,
  iLoveTaguig: iLoveTaguig,
  taguigPRU: taguigPRU,
};
```

### 3. That's It!

Once you update the `images.js` file with your actual imports, the landing page will automatically display your images instead of the placeholders.

## Image Recommendations

### Logo Images
- **Format:** PNG with transparent background
- **Size:** 200x200px minimum
- **Aspect Ratio:** 1:1 (square)

### CVACare Text Logo
- **Format:** PNG with transparent background
- **Size:** Width: 300px, Height: adaptive
- **Background:** Transparent

### Device Screenshots
- **Web System:**
  - Format: PNG or JPG
  - Size: 1920x1080px (16:9 ratio)
  - Shows the web interface

- **Mobile App (CVACare_Android.jpg):**
  - Format: JPG or PNG
  - Size: 1080x1920px (9:16 ratio)
  - Shows the mobile interface

### Partner Logos
- **Format:** PNG with transparent background
- **Size:** 200x200px minimum
- **Aspect Ratio:** Square or original aspect ratio

## Testing

After adding images:
1. Save all files
2. The development server will automatically reload
3. Check the landing page to see your images

## Troubleshooting

If images don't appear:
1. Check that the file names match exactly (case-sensitive)
2. Verify the image paths in `images.js`
3. Make sure images are in the `src/assets/` folder
4. Check browser console for errors
5. Restart the development server: `npm run dev`
