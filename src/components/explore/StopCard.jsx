import React from 'react';
import { Link } from 'react-router-dom';
import RestroomIcon from '@/components/explore/RestroomIcon';

export default function StopCard({ stop, onOpen, onJump }) {
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
      className="cursor-pointer scroll-mt-24 bg-white border border-[rgba(0,51,102,.12)] rounded-xl overflow-hidden flex flex-col shadow-[0_2px_0_rgba(0,51,102,.05)] transition-transform duration-150 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_rgba(0,51,102,.12)]">
      {stop.tile === 'photo' && (
        <div className="aspect-[4/3] bg-[#F5E9D2] overflow-hidden">
          <img src={stop.photo} alt={stop.alt} loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}
      {stop.tile === 'mono' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#0a3d70_0%,#003366_55%,#002244_100%)]">
          <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-[#F2A22B] text-center px-4">{stop.name}</span>
        </div>
      )}
      {stop.tile === 'monoRed' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#c93a10_0%,#CC3300_55%,#8f2400_100%)]">
          <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-white text-center px-4">{stop.name}</span>
        </div>
      )}
      {stop.tile === 'stripe' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[repeating-linear-gradient(135deg,#003366,#003366_12px,#0a3d70_12px,#0a3d70_24px)]">
          <span className="font-heading text-[26px] tracking-[.06em] text-white/90 text-center px-[18px]">{stop.name}</span>
        </div>
      )}
      <div className="p-[18px_18px_20px] flex flex-col gap-2 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">{stop.tag}</span>
          {(stop.amenities || []).map((a) => (
            <span key={a} className="inline-flex items-center gap-1 w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-white border border-[rgba(0,51,102,.22)] rounded-full px-[9px] py-[3px]">
              {a === 'Restroom' && <RestroomIcon size={12} strokeWidth={2.6} aria-hidden="true" />}
              {a}
            </span>
          ))}
        </div>
        <h3 className="font-heading text-[26px] tracking-[.02em] leading-[1.05] text-obsidian-roast m-0">{stop.name}</h3>
        <p className="m-0 text-[14.5px] font-semibold text-[#41556a] flex-1">{stop.copy}</p>
        {stop.tenants && stop.tenants.length > 0 && (
          <p className="m-0 text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93]">
            Shops inside:{' '}
            {stop.tenants.map((tenant, index) => (
              <span key={tenant.id || tenant.name}>
                {index > 0 && ' · '}
                <a
                  href={`#${tenant.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onJump(tenant.id);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="inline-flex min-h-11 items-center font-black tracking-[.08em] uppercase text-primary hover:text-foreground underline decoration-1 underline-offset-2"
                >
                  {tenant.name}
                </a>
              </span>
            ))}
          </p>
        )}
        {stop.building_name && (
          <a
            href={`#${stop.building_id}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onJump(stop.building_id);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="inline-flex min-h-11 items-center w-max text-[11.5px] font-black tracking-[.08em] uppercase text-primary hover:text-foreground pt-0.5"
          >
            Inside {stop.building_name}
          </a>
        )}
        {stop.handles && stop.handles.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {stop.handles.map((handle) => (
              <a
                key={handle}
                href={`https://www.instagram.com/${handle}/`}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="text-[11.5px] font-black tracking-[.06em] text-[#6a7f93] hover:text-midnight-cherry"
              >
                @{handle}
              </a>
            ))}
          </div>
        )}
        {stop.address && (
          <a
            className="block text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] hover:text-midnight-cherry pt-0.5"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address + ' Smiths Grove KY 42171')}`}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {stop.address}
          </a>
        )}
        {stop.distance && (
          <p className="m-0 text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93]">{stop.distance}</p>
        )}
        {stop.cta && (
          <Link
            to={stop.cta.to}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="inline-block w-max mt-1 bg-midnight-cherry text-white font-extrabold tracking-[.06em] uppercase text-[12px] px-4 py-2 rounded-md hover:bg-[#a82a00]"
          >
            {stop.cta.label}
          </Link>
        )}
      </div>
    </article>
  );
}