// The actual print sheet. Rendered on screen as a paper preview and printed
// as-is (everything else on the page is hidden by the print stylesheet).
import React from 'react';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

export default function PrintableMenu({ sections, config }) {
  const { title, subtitle, footer, columns, showDescriptions, showLogo } = config;

  return (
    <div id="print-sheet" className="bg-white text-black mx-auto shadow-float print:shadow-none">
      <div className="px-10 py-8">
        {/* Header */}
        <div className="text-center border-b-4 border-black pb-4 mb-6">
          {showLogo && (
            <img src={LOGO} alt="Flavor Isle" className="w-16 h-16 mx-auto mb-2 rounded-full" />
          )}
          <h1 className="font-heading text-4xl tracking-widest leading-none">{title}</h1>
          {subtitle && <p className="text-[11px] tracking-[0.3em] mt-2 uppercase">{subtitle}</p>}
        </div>

        {/* Sections */}
        <div
          className="gap-8"
          style={{ columnCount: columns, columnGap: '2rem' }}
        >
          {sections.map(section => (
            <div key={section.key} className="mb-5 break-inside-avoid">
              <h2 className="font-heading text-xl tracking-wider border-b-2 border-black pb-1 mb-2 uppercase">
                {section.label}
              </h2>
              <ul className="space-y-1.5">
                {section.items.map(item => (
                  <li key={item.id}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-[13px] leading-snug">{item.name}</span>
                      <span className="flex-1 border-b border-dotted border-gray-400 translate-y-[-3px]" />
                      <span className="font-semibold text-[13px]">
                        {item.price > 0 ? `$${Number(item.price).toFixed(2)}` : ''}
                      </span>
                    </div>
                    {showDescriptions && item.description && (
                      <p className="text-[10.5px] text-gray-700 leading-snug pr-10">{item.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t-2 border-black mt-6 pt-3 text-center">
            <p className="text-[11px] whitespace-pre-line leading-relaxed">{footer}</p>
          </div>
        )}
      </div>
    </div>
  );
}