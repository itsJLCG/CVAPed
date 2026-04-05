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
import cvapedQr from './CVAPed_QR.png';
import hardwareFoot from './Hardware_Foot.png';
import hardwareWaist from './Hardware_Waist.png';

// Team photos
import mayorLani from './team/mayor_lani.png';
import drNathaniel from './team/dr_nathaniel.png';
import sirNestor from './team/sirnestor.png';
import mamCristine from './team/mamcristine.png';
import jhonLudwig from './team/jhon_ludwig.jpg';
import gwynBarte from './team/gwyn_barte.jpg';
import kristineMae from './team/khristine_mae.jpg';
import jhunMark from './team/jhun_mark.jpg';

export const images = {
  // Logo and branding
  logo: logo, // CVACare main logo
  cvacareText: cvacareText, // CVACare text logo image
  imageBig: imageBig, // CVACare big image for auth pages
  
  // Device screenshots
  webSystem: cvapedQr, // CVAPed application QR code
  mobileApp: mobileApp, // CVACare Android mobile app screenshot
  hardwareFoot: hardwareFoot, // CVAPed foot wearable hardware image
  hardwareWaist: hardwareWaist, // CVAPed waist wearable hardware image
  
  // Partner logos
  tupLogo: tupLogo, // TUP logo
  iLoveTaguig: iLoveTaguig, // I Love Taguig logo
  taguigPRU: taguigPRU, // Taguig Physical Rehabilitation Unit logo
  
  // Therapy images
  physicalTherapy: physicalTherapy, // Physical Therapy image
  speechTherapy: speechTherapy, // Speech Therapy image
  
  // Team photos
  mayorLani: mayorLani, // Mayor Lani Cayetano
  drNathaniel: drNathaniel, // Dr. Noel Nathaniel C. Napa
  mamCristine: mamCristine, // Ms. Christine Joy R. Cabardo
  sirNestor: sirNestor, // Sir. Nestor R. Valdez
  jhonLudwig: jhonLudwig, // Jhon Ludwig C. Gayapa
  gwynBarte: gwynBarte, // Gwyn S. Barte
  kristineMae: kristineMae, // Kristine Mae P. Prado
  jhunMark: jhunMark, // Jhun Mark G. Obreros
};

// Helper function to check if image exists
export const hasImage = (imageName) => {
  return images[imageName] !== null;
};
