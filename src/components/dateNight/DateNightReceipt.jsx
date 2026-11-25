import React from 'react';

const modNames = (line) => (line.selectedModifiers || line.selected_mods || []).map((mod) => mod?.name).filter(Boolean);

// A person's picks, printed like a diner receipt with a torn bottom edge. No pair
// price and no discount line: each item is its own live menu price (issue #357).
export default function DateNightReceipt({ name, lines = [], kicker = 'Flavor Isle · Smiths Grove' }) {
  const total = lines.reduce((sum, line) => sum + (Number(line.price) || 0), 0);

  return (
    <div className="dn-receipt">
      <p className="dn-receipt-kicker">{kicker}</p>
      <p className="dn-receipt-name">{name || 'Your name'}</p>
      {lines.length === 0 ? (
        <p className="dn-receipt-empty">Nothing picked yet.</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {lines.map((line, index) => (
            <li key={`${line.id || line.name}-${index}`} className="dn-receipt-line">
              <span>
                {line.name}
                {modNames(line).length > 0 && <span className="dn-receipt-mods">{modNames(line).join(', ')}</span>}
              </span>
              <span>${(Number(line.price) || 0).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="dn-receipt-total">
        <span>Your total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}