import "../chunks/chunk.2SU6QBUU.js";
import "../chunks/chunk.DT2WPFWO.js";
import {
  registerTranslation
} from "../chunks/chunk.TDEXDIPB.js";
import "../chunks/chunk.W27M6RDR.js";

// src/translations/nb.ts
var translation = {
  $code: "nb",
  $name: "Norwegian Bokm\xE5l",
  $dir: "ltr",
  carousel: "Karusell",
  clearEntry: "T\xF8m felt",
  close: "Lukk",
  copied: "Kopiert",
  copy: "Kopier",
  currentValue: "N\xE5v\xE6rende verdi",
  error: "Feil",
  goToSlide: (slide, count) => `G\xE5 til visning ${slide} av ${count}`,
  hidePassword: "Skjul passord",
  loading: "Laster",
  nextSlide: "Neste visning",
  numOptionsSelected: (num) => {
    if (num === 0) return "Ingen alternativer valgt";
    if (num === 1) return "Ett alternativ valgt";
    return `${num} alternativer valgt`;
  },
  previousSlide: "Forrige visning",
  progress: "Fremdrift",
  remove: "Fjern",
  resize: "Endre st\xF8rrelse",
  scrollToEnd: "Rull til slutten",
  scrollToStart: "Rull til starten",
  selectAColorFromTheScreen: "Velg en farge fra skjermen",
  showPassword: "Vis passord",
  slideNum: (slide) => `Visning ${slide}`,
  toggleColorFormat: "Bytt fargeformat"
};
registerTranslation(translation);
var nb_default = translation;
export {
  nb_default as default
};
