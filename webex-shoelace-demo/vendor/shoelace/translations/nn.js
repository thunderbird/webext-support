import "../chunks/chunk.2SU6QBUU.js";
import "../chunks/chunk.DT2WPFWO.js";
import {
  registerTranslation
} from "../chunks/chunk.TDEXDIPB.js";
import "../chunks/chunk.W27M6RDR.js";

// src/translations/nn.ts
var translation = {
  $code: "nn",
  $name: "Norwegian Nynorsk",
  $dir: "ltr",
  carousel: "Karusell",
  clearEntry: "T\xF8m felt",
  close: "Lukk",
  copied: "Kopiert",
  copy: "Kopier",
  currentValue: "N\xE5verande verdi",
  error: "Feil",
  goToSlide: (slide, count) => `G\xE5 til visning ${slide} av ${count}`,
  hidePassword: "G\xF8ym passord",
  loading: "Lastar",
  nextSlide: "Neste visning",
  numOptionsSelected: (num) => {
    if (num === 0) return "Ingen alternativ valt";
    if (num === 1) return "Eitt alternativ valt";
    return `${num} alternativ valt`;
  },
  previousSlide: "F\xF8rre visning",
  progress: "Framdrift",
  remove: "Fjern",
  resize: "Endre storleik",
  scrollToEnd: "Rull til slutten",
  scrollToStart: "Rull til starten",
  selectAColorFromTheScreen: "Vel ein farge fr\xE5 skjermen",
  showPassword: "Vis passord",
  slideNum: (slide) => `Visning ${slide}`,
  toggleColorFormat: "Byt fargeformat"
};
registerTranslation(translation);
var nn_default = translation;
export {
  nn_default as default
};
