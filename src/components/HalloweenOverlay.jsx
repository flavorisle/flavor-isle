import React from 'react';
import HalloweenBats from './HalloweenBats';
import WitchPopup from './WitchPopup';

// Global Halloween theme overlay — flying bats in the background plus a
// witch that pops up on button clicks. Purely decorative, pointer-events none
// on the ambient layer so it never blocks interaction.
export default function HalloweenOverlay() {
  return (
    <>
      <HalloweenBats />
      <WitchPopup />
    </>
  );
}