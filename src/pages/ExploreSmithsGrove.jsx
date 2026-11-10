import React from 'react';
import { Navigate } from 'react-router-dom';

// Explore Smiths Grove now lives as the "Around Flavor Isle" section of the
// Visit Us page. The hash is carried across so deep links like
// /explore-smiths-grove#bucees still land on that stop's card.
export default function ExploreSmithsGrove() {
  return <Navigate to={`/i65-exit-38${window.location.hash}`} replace />;
}