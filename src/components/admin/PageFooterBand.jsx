import React from 'react';
import { squareMoney } from '@/lib/buildCardContent';

// Base and thickness, printed once at the foot of every sheet. Content is the
// Square group wording and options, not a house-written spec block.
export default function PageFooterBand({ groups, px, height }) {
  if (!groups.length) return null;

  return (
    <div
      className="build-card-footer"
      style={{
        marginTop: px(22), height: px(height), boxSizing: 'border-box', overflow: 'hidden',
        backgroundColor: '#12233D', color: '#ffffff', padding: `${px(14)} ${px(28)}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}
    >
      <div
        className="uppercase"
        style={{ fontFamily: "'BarlowBold', sans-serif", fontWeight: 700, fontSize: px(26), letterSpacing: px(3), color: '#ffffff', marginBottom: px(8) }}
      >
        Every Bliss shake
      </div>
      <div style={{ display: 'flex', gap: px(28) }}>
        {groups.map(group => (
          <div key={group.key} style={{ flex: '1 1 0', minWidth: 0 }}>
            <div
              className="uppercase break-words"
              style={{ fontFamily: "'BarlowBold', sans-serif", fontWeight: 700, fontSize: px(21), letterSpacing: px(2), color: '#ffffff' }}
            >
              {group.name}
            </div>
            <div style={{ fontSize: px(24), lineHeight: 1.3 }}>
              {group.modifiers.map(option => (
                <div key={option.key} className="break-words">
                  {option.name}{option.price_money?.amount > 0 ? ` ${squareMoney(option.price_money)}` : ''}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}