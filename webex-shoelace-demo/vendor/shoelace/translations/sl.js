import {
  registerTranslation
} from "../chunks/chunk.TDEXDIPB.js";
import "../chunks/chunk.W27M6RDR.js";

// src/translations/sl.ts
var translation = {
  $code: "sl",
  $name: "Slovenski",
  $dir: "ltr",
  carousel: "Vrtiljak",
  clearEntry: "Po\u010Disti vnos",
  close: "Zapri",
  copied: "Kopirano",
  copy: "Kopiraj",
  currentValue: "Trenutna vrednost",
  error: "Napaka",
  goToSlide: (slide, count) => `Pojdi na diapozitiv ${slide} od ${count}`,
  hidePassword: "Skrij geslo",
  loading: "Nalaganje",
  nextSlide: "Naslednji diapozitiv",
  numOptionsSelected: (num) => {
    if (num === 0) return "Nobena mo\u017Enost ni izbrana";
    if (num === 1) return "1 mo\u017Enost izbrana";
    if (num === 2) return "2 mo\u017Enosti izbrani";
    if (num === 3 || num === 4) return `${num} mo\u017Enosti izbrane`;
    return `${num} mo\u017Enosti izbranih`;
  },
  previousSlide: "Prej\u0161nji diapozitiv",
  progress: "Napredek",
  remove: "Odstrani",
  resize: "Spremeni velikost",
  scrollToEnd: "Pomakni se na konec",
  scrollToStart: "Pomakni se na za\u010Detek",
  selectAColorFromTheScreen: "Izberite barvo z zaslona",
  showPassword: "Prika\u017Ei geslo",
  slideNum: (slide) => `Diapozitiv ${slide}`,
  toggleColorFormat: "Preklopi format barve"
};
registerTranslation(translation);
var sl_default = translation;
export {
  sl_default as default
};
