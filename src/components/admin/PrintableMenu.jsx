// The actual print sheet. Rendered on screen as a paper preview and printed
// as-is (everything else on the page is hidden by the print stylesheet).
import React from 'react';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Resolve the size rows for a printed item. Override sizes (print_sizes) take
// precedence; otherwise auto-detect from the menu item's "Size" modifier list.
// Custom items only use their own print_sizes. Returns null if no sizes.
function getItemSizes(item) {
  if (item.is_custom) return item.print_sizes?.length ? item.print_sizes : null;
  if (item.print_sizes !== undefined) return item.print_sizes.length ? item.print_sizes : null;
  const sizeList = (item.modifiers || []).find(m => /size/i.test(m.name || ''));
  if (!sizeList?.modifiers?.length) return null;
  return sizeList.modifiers
    .filter(o => !o.sold_out)
    .map(o => ({ label: o.name, price: Number(item.price) + Number(o.price || 0) }));
}

// Click-to-edit text on the preview. Commits on blur; plain text only.
function Editable({ as: Tag = 'span', value, onCommit, className, placeholder, style }) {
  if (!onCommit) return <Tag className={className} style={style}>{value}</Tag>;
  return (
    <Tag
      className={`${className} outline-none rounded print:!bg-transparent hover:bg-yellow-50 focus:bg-yellow-50 cursor-text ${!value ? 'text-gray-400 print:hidden' : ''}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={e => {
        const text = e.currentTarget.textContent.trim();
        onCommit(text === placeholder ? '' : text);
      }}
      onFocus={e => { if (!value && placeholder) e.currentTarget.textContent = ''; }}
      onKeyDown={e => { if (e.key === 'Enter' && Tag !== 'p') { e.preventDefault(); e.currentTarget.blur(); } }}
    >
      {value || placeholder}
    </Tag>
  );
}

export default function PrintableMenu({ sections, config, onEditItem, onEditSection, consolidatedSections }) {
  const { title, subtitle, footer, columns, showDescriptions, showLogo, accountTitle, accountInfo } = config;

  return (
    <div id="print-sheet" className="bg-white text-black mx-auto shadow-float print:shadow-none">
      <div className="px-6 py-6">
        {/* Header */}
        <div className="text-center border-b-4 border-black pb-4 mb-6">
          {showLogo && (
            <img src={LOGO} alt="Flavor Isle" className="w-16 h-16 mx-auto mb-2" style={{ borderRadius: '50%', display: 'block' }} />
          )}
          <h1 className="font-heading text-4xl tracking-widest leading-none">{title}</h1>
          {subtitle && <p className="text-[11px] tracking-[0.3em] mt-2 uppercase">{subtitle}</p>}
        </div>

        {/* Sections — CSS multi-column. Sections flow naturally across columns;
            only individual items avoid breaking mid-item. */}
        <div style={{ columnCount: columns, columnGap: '1.5rem' }}>
          {sections.map(section => {
            const cons = consolidatedSections?.[section.key];

            // Consolidated section — one price + flavor list + extra cost.
            // Used for shakes: instead of listing every flavor with small/large,
            // show a single price and list all flavors as text.
            if (cons) {
              return (
                <div key={section.key} className="mb-4" style={{ breakInside: 'avoid' }}>
                  <Editable
                    as="h2"
                    className="font-heading text-xl tracking-wider border-b-2 border-black pb-1 mb-2 uppercase"
                    style={{ breakAfter: 'avoid' }}
                    value={section.label}
                    onCommit={onEditSection && (v => onEditSection(section.key, v))}
                  />
                  <div className="flex items-baseline gap-1">
                    <span className="font-semibold text-[13px]">Any flavor</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 translate-y-[-2px] min-w-[8px]" />
                    <span className="font-semibold text-[13px]">${Number(cons.price || 0).toFixed(2)}</span>
                  </div>
                  {cons.flavors && (
                    <p className="text-[10px] text-gray-700 leading-snug mt-1">
                      Flavors: {cons.flavors}
                    </p>
                  )}
                  {Number(cons.extraCost) > 0 && (
                    <p className="text-[10px] text-gray-700 leading-snug">
                      Extra flavors +${Number(cons.extraCost).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            }

            // Normal section — list each item with price or size pricing
            return (
              <div key={section.key} className="mb-4">
                <Editable
                  as="h2"
                  className="font-heading text-xl tracking-wider border-b-2 border-black pb-1 mb-2 uppercase"
                  style={{ breakAfter: 'avoid' }}
                  value={section.label}
                  onCommit={onEditSection && (v => onEditSection(section.key, v))}
                />
                <ul className="space-y-1">
                  {section.items.map(item => {
                    const sizes = getItemSizes(item);
                    return (
                      <li key={item.id} style={{ breakInside: 'avoid' }}>
                        <div className="flex items-baseline gap-1">
                          <Editable
                            className="font-semibold text-[12px] leading-snug flex-shrink-0 max-w-[60%]"
                            value={item.name}
                            onCommit={onEditItem && (v => onEditItem(item.id, 'name', v))}
                          />
                          <span className="flex-1 border-b border-dotted border-gray-400 translate-y-[-2px] min-w-[8px]" />
                          {!sizes && (
                            <span className="font-semibold text-[12px] flex-shrink-0">
                              {item.price > 0 ? `$${Number(item.price).toFixed(2)}` : ''}
                            </span>
                          )}
                        </div>
                        {sizes && (
                          <p className="text-[10px] font-semibold leading-snug text-gray-600">
                            {sizes.map((s, i) => (
                              <span key={i}>
                                {i > 0 && <span className="text-gray-400"> · </span>}
                                {s.label} ${Number(s.price).toFixed(2)}
                              </span>
                            ))}
                          </p>
                        )}
                        {showDescriptions && (item.description || onEditItem) && (
                          <Editable
                            as="p"
                            className="text-[9.5px] text-gray-600 leading-snug"
                            value={item.description || ''}
                            placeholder="Add description…"
                            onCommit={onEditItem && (v => onEditItem(item.id, 'description', v))}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
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