// The printed Food Builds sheet: the loaded-fry cards the crew builds from,
// printed on letter paper one card per page with the same photo tiles the admin
// tab shows, so the ticked options (house defaults) print exactly as they build.
import React from 'react';
import FoodBuildCard from '@/components/admin/FoodBuildCard';
import { optimizedImageUrl } from '@/lib/utils';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

const PRINT_RULES = `@media print {
  @page { size: 8.5in 11in; margin: 0.4in; }
  .food-build-page { break-after: page; page-break-after: always; }
  .food-build-page:last-child { break-after: auto; page-break-after: auto; }
}`;

export default function PrintableFoodBuilds({ builds = [] }) {
  return (
    <div id="print-sheet" className="force-light bg-white text-black mx-auto print:shadow-none">
      <style>{PRINT_RULES}</style>

      {builds.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No food builds are ready to print yet.</p>
      ) : builds.map((build) => (
        <section
          key={build.key}
          className="food-build-page flex flex-col"
          style={{ width: '8.5in', minHeight: '10.2in', marginBottom: '1.5rem' }}
        >
          <div className="flex items-center gap-3 border-b-4 border-black pb-3 mb-4">
            <img src={optimizedImageUrl(LOGO, 200, 200, 'fit')} alt="Flavor Isle" width="200" height="200" className="w-12 h-12 object-contain" />
            <div>
              <p className="font-heading text-2xl leading-none tracking-widest">FLAVOR ISLE</p>
              <p className="text-[10px] tracking-[0.3em] uppercase mt-1">Food Builds · Fry station</p>
            </div>
          </div>

          <FoodBuildCard build={build} />

          <p className="mt-auto pt-4 text-[10px] text-gray-600 text-center">
            Ticked tiles are the house defaults · 103 N Main St, Smiths Grove, KY · (270) 563-4618
          </p>
        </section>
      ))}
    </div>
  );
}