import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RestroomIcon from '@/components/explore/RestroomIcon';

// Flavor Isle's own pin, the origin of every walking route on this panel.
const FLAVOR_ISLE = [37.0526542, -86.2082906];

// Valhalla hands back the walking shape as an encoded polyline at precision 6:
// each point is a pair of zig-zag encoded deltas of 3 characters, so six
// characters advance to the next point. Deltas are accumulated, then divided by
// 1e6 to land back in degrees.
function decodeShape(encoded) {
  const factor = 1e6;
  const points = [];
  let lat = 0;
  let lng = 0;
  let i = 0;
  while (i < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / factor, lng / factor]);
  }
  return points;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Leaflet measures its container on mount, which is before the dialog finishes
// animating in — nudge it once so the mini map is never half-drawn.
function MapReady() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function DetailBody({ shop, onJump }) {
  const [interiorFailed, setInteriorFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const usingInterior = !!shop.interior_photo_url && !interiorFailed;
  const heroUrl = usingInterior ? shop.interior_photo_url : photoFailed ? '' : shop.photo || '';
  const heroAlt = (usingInterior ? shop.interior_photo_alt || shop.alt : shop.alt) || shop.name;

  const walkPoints = shop.walk_polyline ? decodeShape(shop.walk_polyline) : [];
  const walkMiles = Number(shop.walk_miles) || 0;
  const walkMinutes = Number(shop.walk_minutes) || 1;
  const shopPoint =
    Number.isFinite(shop.lat) && Number.isFinite(shop.lng)
      ? [shop.lat, shop.lng]
      : walkPoints[walkPoints.length - 1];
  const destination = shop.address ? encodeURIComponent(shop.address) : `${shop.lat},${shop.lng}`;
  const walkHref = `https://www.google.com/maps/dir/?api=1&origin=103+N+Main+St+Smiths+Grove+KY+42171&destination=${destination}&travelmode=walking`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${shop.address} Smiths Grove KY 42171`,
  )}`;
  const websiteHref = shop.website
    ? /^https?:\/\//i.test(shop.website)
      ? shop.website
      : `https://${shop.website}`
    : '';

  return (
    <>
      <div className="relative h-[190px] sm:h-[240px] bg-[#F5E9D2] overflow-hidden rounded-t-xl">
        <button
          type="button"
          onClick={() => heroUrl && setZoomed(true)}
          aria-label={`Enlarge photo of ${shop.name}`}
          className="block w-full h-full p-0 m-0 border-0 bg-transparent cursor-zoom-in"
        >
          {heroUrl ? (
            <img
              src={heroUrl}
              alt={heroAlt}
              className="w-full h-full object-cover"
              onError={() => (usingInterior ? setInteriorFailed(true) : setPhotoFailed(true))}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#0a3d70_0%,#003366_55%,#002244_100%)]">
              <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-[#F2A22B] text-center px-4">
                {shop.name}
              </span>
            </div>
          )}
        </button>
        <span className="absolute left-3 top-3 inline-block text-[10.5px] font-black tracking-[.14em] uppercase text-white bg-[rgba(0,51,102,.88)] rounded-full px-[10px] py-[3px]">
          Inside
        </span>
      </div>

      {shop.interior_caption && (
        <p className="m-0 px-5 pt-2 text-[11.5px] uppercase tracking-[.08em] text-[#6a7f93]">
          {shop.interior_caption}
        </p>
      )}

      <div className="px-5 pb-6 pt-4 flex flex-col gap-2.5">
        <DialogHeader className="gap-1.5 space-y-0 text-left">
          <span className="inline-block w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">
            {shop.tag}
          </span>
          <DialogTitle className="font-heading text-[26px] tracking-[.02em] leading-[1.05] text-obsidian-roast">
            {shop.name}
          </DialogTitle>
          <DialogDescription className="m-0 whitespace-pre-line text-[14.5px] font-semibold text-[#41556a]">
            {shop.detail || shop.copy}
          </DialogDescription>
        </DialogHeader>

        {shop.address && (
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <p className="m-0 text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93]">
              {shop.address}
            </p>
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener"
              className="inline-block w-max bg-midnight-cherry text-white font-extrabold tracking-[.06em] uppercase text-[11px] px-3 py-1.5 rounded-md hover:bg-[#a82a00]"
            >
              Directions
            </a>
          </div>
        )}

            {shop.amenities?.includes('Restroom') && (
              <p className="flex items-center gap-1.5 m-0 text-[12px] font-black tracking-[.08em] uppercase text-[#6a7f93]">
                <RestroomIcon size={13} strokeWidth={2.6} aria-hidden="true" />
                Restroom available
              </p>
            )}

        {shop.building_name && (
          <p className="m-0 text-[13px] text-[#41556a]">
            Inside{' '}
            <a href={`#${shop.building_id}`} onClick={(e) => { e.preventDefault(); onJump(shop.building_id); }} className="inline-flex min-h-11 items-center font-semibold text-primary underline">
              {shop.building_name}
            </a>
            {shop.building_address ? `, ${shop.building_address}` : ''}.
          </p>
        )}

        {shop.tenants && shop.tenants.length > 0 && (
          <p className="m-0 text-[13px] text-[#41556a]">
            <span className="text-[11.5px] font-black tracking-[.08em] uppercase text-muted-foreground mr-1.5">Shops inside:</span>
            {shop.tenants.map((tenant, index) => (
              <span key={tenant.id || tenant.name}>
                {index > 0 && ' \u00b7 '}
                <a href={`#${tenant.id}`} onClick={(e) => { e.preventDefault(); onJump(tenant.id); }} className="inline-flex min-h-11 items-center font-semibold text-primary hover:text-foreground underline decoration-1 underline-offset-2">
                  {tenant.name}
                </a>
              </span>
            ))}
          </p>
        )}

        {shop.hours && (
          <p className="m-0 text-[13px] text-[#41556a]">
            <span className="text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] mr-1.5">Hours</span>
            {shop.hours}
          </p>
        )}

        {shop.phone && (
          <p className="m-0 text-[13px] text-[#41556a]">
            <span className="text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] mr-1.5">Phone</span>
            <a href={`tel:${shop.phone}`} className="font-semibold text-midnight-cherry hover:text-obsidian-roast">
              {shop.phone}
            </a>
          </p>
        )}

        {websiteHref && (
          <p className="m-0 text-[13px] text-[#41556a]">
            <span className="text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] mr-1.5">Web</span>
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener"
              className="font-semibold text-midnight-cherry hover:text-obsidian-roast break-all"
            >
              {hostnameOf(websiteHref)}
            </a>
          </p>
        )}

        {shop.handles && shop.handles.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {shop.handles.map((handle) => (
              <a
                key={handle}
                href={`https://www.instagram.com/${handle}/`}
                target="_blank"
                rel="noopener"
                className="text-[11.5px] font-black tracking-[.06em] text-[#6a7f93] hover:text-midnight-cherry"
              >
                @{handle}
              </a>
            ))}
          </div>
        )}

        {walkPoints.length > 0 && shopPoint && (
          <div className="pt-1.5 flex flex-col gap-2">
            <span className="inline-block w-max text-[11.5px] font-black tracking-[.08em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">
              {walkMiles < 0.03 ? 'Next door · 1 min walk' : `${walkMiles} mi · ${walkMinutes} min walk`}
            </span>

            <div className="h-[200px] rounded-lg overflow-hidden border border-[rgba(0,51,102,.12)]">
              <MapContainer
                center={shopPoint}
                zoom={16}
                scrollWheelZoom={false}
                className="w-full h-full"
                style={{ zIndex: 0 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline positions={walkPoints} pathOptions={{ color: '#F5A623', weight: 4 }} />
                <CircleMarker
                  center={FLAVOR_ISLE}
                  radius={7}
                  pathOptions={{ color: '#CC3300', fillColor: '#CC3300', fillOpacity: 1, weight: 2 }}
                >
                  <Tooltip direction="top" offset={[0, -6]} permanent>
                    Flavor Isle
                  </Tooltip>
                </CircleMarker>
                <CircleMarker
                  center={shopPoint}
                  radius={7}
                  pathOptions={{ color: '#003366', fillColor: '#003366', fillOpacity: 1, weight: 2 }}
                >
                  <Tooltip direction="bottom" offset={[0, 6]} permanent>
                    {shop.name}
                  </Tooltip>
                </CircleMarker>
                <MapReady />
              </MapContainer>
            </div>

            {shop.walk_steps && shop.walk_steps.length > 0 && (
              <ol className="m-0 pl-5 list-decimal flex flex-col gap-1 text-[13px] text-[#41556a]">
                {shop.walk_steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            )}

            <a
              href={walkHref}
              target="_blank"
              rel="noopener"
              className="text-[11.5px] font-black tracking-[.08em] uppercase text-midnight-cherry hover:text-obsidian-roast"
            >
              Open walking directions
            </a>
          </div>
        )}
      </div>

      {zoomed && heroUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${shop.name} photo`}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close enlarged photo"
            className="absolute right-4 top-4 rounded-full bg-white/90 text-[#003366] w-9 h-9 flex items-center justify-center text-[18px] font-black leading-none"
          >
            ×
          </button>
          <img
            src={heroUrl}
            alt={heroAlt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}

// One shop's full story, opened from a card on /explore-smiths-grove.
export default function ShopDetailDialog({ shop, onClose, onJump }) {
  return (
    <Dialog open={!!shop} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="!p-0 !gap-0 w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto rounded-xl sm:rounded-xl"
        aria-describedby={undefined}
      >
        {shop && <DetailBody key={shop.id || shop.name} shop={shop} onJump={onJump} />}
      </DialogContent>
    </Dialog>
  );
}