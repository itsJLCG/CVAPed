// Image paths configuration
// Import actual images
import logo from './CVACare_Logo.png';
import cvacareText from './CVAPed_Text.png';
import mobileApp from './CVACare_Android.png';
import tupLogo from './CVACare_TUP.png';
import iLoveTaguig from './CVACare_ILoveTaguig.png';
import taguigPRU from './CVACare_TPMRU.jpeg';
import imageBig from './CVACare_ImageBig.png';
import physicalTherapy from './CVACare_Physical_Therapy.png';
import speechTherapy from './CVACare_Speech_Therapy.png';

export const images = {
  // Logo and branding
  logo: logo, // CVACare main logo
  cvacareText: cvacareText, // CVACare text logo image
  imageBig: imageBig, // CVACare big image for auth pages
  
  // Device screenshots
  webSystem: null, // Add web system screenshot when available
  mobileApp: mobileApp, // CVACare Android mobile app screenshot
  
  // Partner logos
  tupLogo: tupLogo, // TUP logo
  iLoveTaguig: iLoveTaguig, // I Love Taguig logo
  taguigPRU: taguigPRU, // Taguig Physical Rehabilitation Unit logo
  
  // Therapy images
  physicalTherapy: physicalTherapy, // Physical Therapy image
  speechTherapy: speechTherapy, // Speech Therapy image
};

// Helper function to check if image exists
export const hasImage = (imageName) => {
  return images[imageName] !== null;
};
