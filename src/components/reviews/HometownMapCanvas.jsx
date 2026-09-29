import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FocusPin({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.latitude, location.longitude], 7);
  }, [location, map]);
  return null;
}

export default function HometownMapCanvas({ pins, focus }) {
  const grouped = Object.values(pins.reduce((cities, pin) => {
    const key = `${pin.city}|${pin.region}|${pin.country}`.toLowerCase();
    if (!cities[key]) cities[key] = { ...pin, count: 0 };
    cities[key].count++;
    return cities;
  }, {}));
  return (
    <div className="h-80 sm:h-[420px] rounded-2xl overflow-hidden border border-border" role="region" aria-label="Map of visitors' hometowns">
      <MapContainer center={[38, -96]} zoom={4} scrollWheelZoom={false} className="w-full h-full" style={{ zIndex: 0 }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {grouped.map(pin => (
          <CircleMarker key={`${pin.city}|${pin.region}|${pin.country}`} center={[pin.latitude, pin.longitude]} radius={Math.min(8 + pin.count * 2, 20)} pathOptions={{ color: 'var(--cream-white)', fillColor: 'var(--midnight-cherry)', fillOpacity: 1, weight: 2 }}>
            <Popup>{pin.city}, {pin.region}{pin.count > 1 ? ` · ${pin.count} visitors` : ' · 1 visitor'}</Popup>
          </CircleMarker>
        ))}
        <FocusPin location={focus} />
      </MapContainer>
    </div>
  );
}