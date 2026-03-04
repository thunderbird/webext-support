import {
  registerTranslation
} from "../chunks/chunk.TDEXDIPB.js";
import "../chunks/chunk.W27M6RDR.js";

// src/translations/fi.ts
var translation = {
  $code: "fi",
  $name: "Suomi",
  $dir: "ltr",
  carousel: "Karuselli",
  clearEntry: "Poista merkint\xE4",
  close: "Sulje",
  copied: "Kopioitu",
  copy: "Kopioi",
  currentValue: "Nykyinen arvo",
  error: "Virhe",
  goToSlide: (slide, count) => `Siirry diaan ${slide} / ${count}`,
  hidePassword: "Piilota salasana",
  loading: "Ladataan",
  nextSlide: "Seuraava dia",
  numOptionsSelected: (num) => {
    if (num === 0) return "Ei valittuja vaihtoehtoja";
    if (num === 1) return "Yksi vaihtoehto valittu";
    return `${num} vaihtoehtoa valittu`;
  },
  previousSlide: "Edellinen dia",
  progress: "Edistyminen",
  remove: "Poista",
  resize: "Muuta kokoa",
  scrollToEnd: "Vierit\xE4 loppuun",
  scrollToStart: "Vierit\xE4 alkuun",
  selectAColorFromTheScreen: "Valitse v\xE4ri n\xE4yt\xF6lt\xE4",
  showPassword: "N\xE4yt\xE4 salasana",
  slideNum: (slide) => `Dia ${slide}`,
  toggleColorFormat: "Vaihda v\xE4riformaattia"
};
registerTranslation(translation);
var fi_default = translation;
export {
  fi_default as default
};
