// The actual print sheet. Rendered on screen as a paper preview and printed
// as-is (everything else on the page is hidden by the print stylesheet).
import React from 'react';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Pull the "Size" modifier list off an item (drinks, shakes) and turn it into
// printable size → price pairs. All other modifier lists are ignored on print.
function sizePrices(item) {
  const sizeList = (item.modifiers || []).find(m => /size/i.test(m.name || ''));
  if (!sizeList?.modifiers?.length) return null;
  return sizeList.modifiers
    .filter(o => !o.sold_out)
    .map(o => ({ label: o.name, price: Number(item.price) + Number(o.price || 0) }));
}

export default function PrintableMenu({ sections, config }) {
  const { title, subtitle, footer, columns, showDescriptions, showLogo, accountTitle, accountInfo } = config;

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
                {section.items.map(item => {
                  const sizes = sizePrices(item);
                  return (
                    <li key={item.id}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-[13px] leading-snug">{item.name}</span>
                        <span className="flex-1 border-b border-dotted border-gray-400 translate-y-[-3px]" />
                        {!sizes && (
                          <span className="font-semibold text-[13px]">
                            {item.price > 0 ? `$${Number(item.price).toFixed(2)}` : ''}
                          </span>
                        )}
                      </div>
                      {sizes && (
                        <p className="text-[11px] font-semibold leading-snug">
                          {sizes.map((s, i) => (
                            <span key={s.label}>
                              {i > 0 && <span className="text-gray-500"> · </span>}
                              {s.label} ${s.price.toFixed(2)}
                            </span>
                          ))}
                        </p>
                      )}
                      {showDescriptions && item.description && (
                        <p className="text-[10.5px] text-gray-700 leading-snug pr-10">{item.description}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Account info — separated block above the footer */}
        {accountInfo && (
          <div className="border-t-4 border-black mt-6 pt-3 text-center break-inside-avoid">
            {accountTitle && (
              <h2 className="font-heading text-lg tracking-widest uppercase mb-1">{accountTitle}</h2>
            )}
            <p className="text-[11px] whitespace-pre-line leading-relaxed max-w-3xl mx-auto">{accountInfo}</p>
          </div>
        )}

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