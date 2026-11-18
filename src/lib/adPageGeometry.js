// Physical Letter page geometry. Printer scale stays at 100%; the complete
// artwork is fitted inside the narrow printable area without cropping.
export const AD_PAPER = { width: 8.5, height: 11, margin: 0.25 };
export const AD_ARTWORK = { width: 816, height: 1056 };
export const AD_PRINT_AREA = {
  width: AD_PAPER.width - AD_PAPER.margin * 2,
  height: AD_PAPER.height - AD_PAPER.margin * 2,
};
export const AD_ART_SCALE = Math.min(
  AD_PRINT_AREA.width * 96 / AD_ARTWORK.width,
  AD_PRINT_AREA.height * 96 / AD_ARTWORK.height,
);
export const AD_PLACEMENT = {
  width: AD_ARTWORK.width * AD_ART_SCALE / 96,
  height: AD_ARTWORK.height * AD_ART_SCALE / 96,
};
AD_PLACEMENT.x = (AD_PAPER.width - AD_PLACEMENT.width) / 2;
AD_PLACEMENT.y = (AD_PAPER.height - AD_PLACEMENT.height) / 2;