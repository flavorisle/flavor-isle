import React from 'react';
import { Link } from 'react-router-dom';

export default function SurroundCard({ stop, onOpen }) {
  return (
    <article
      id={stop.id}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(stop)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(stop);
        }
      }}
      className="cursor-pointer scroll-mt-24 bg-white border border-[rgba(0,51,102,.12)] rounded-xl overflow-hidden flex flex-col shadow-[0_2px_0_rgba(0,51,102,.05)] transition-transform duration-150 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_rgba(0,51,102,.12)]"
    >
      {stop.photo ? (
        <div className="aspect-[4/3] bg-[#F5E9D2] overflow-hidden">
          <img src={stop.photo} alt={stop.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[4/3] flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#0a3d70_0%,#003366_55%,#002244_100%)]">
          <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-[#F2A22B] text-center px-4">{stop.name}</span>
        </div>
      )}
      <div className="p-[18px_18px_20px] flex flex-col gap-2 flex-1">
        <span className="inline-block w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">{stop.tag}</span>
        <h3 className="font-heading text-[26px] tracking-[.02em] leading-[1.05] text-obsidian-roast m-0">{stop.name}</h3>
        <p className="m-0 text-[14.5px] font-semibold text-[#41556a] flex-1">{stop.copy}</p>
        {stop.distance && (
          <p className="m-0 text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93]">{stop.distance}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          {stop.link && (
            <Link
              to={stop.link.to}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="text-[11.5px] font-black tracking-[.08em] uppercase text-midnight-cherry hover:text-obsidian-roast"
            >
              {stop.link.label}
            </Link>
          )}
          {stop.map && (
            <a
              href={stop.map}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] hover:text-midnight-cherry"
            >
              Map
            </a>
          )}
        </div>
      </div>
    </article>
  );
}