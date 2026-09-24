import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Share2, X, Loader2, LogIn, Sparkles, Search, Camera, Plus, UtensilsCrossed, MapPinned, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/Navbar';

// Smiths Grove, KY — home of Flavor Isle
const HOME_CENTER = [36.9884, -86.2136];

// Cherry-colored traveler pin built as a divIcon so we don't depend on
// Leaflet's bundled image assets (which break under Vite).
const pinIcon = L.divIcon({
  className: 'traveler-pin-icon',
  html: `<svg width="34" height="44" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#CC3300" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#FDF6E3"/>
  </svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
  popupAnchor: [0, -40],
});

// Captures map clicks so the parent can open the "add a pin" form.
function MapClickHandler({ onMapClick, disabled }) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Recalculate the map's tile layout after mount. The route is wrapped in a
// framer-motion opacity/transform animation (App.jsx), which makes Leaflet
// compute tile positions against a mid-animation container and render grey.
// invalidateSize() once the animation settles fixes the blank map.
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

export default function TravelerMap() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // { lat, lng }
  const [form, setForm] = useState({ name: '', comment: '', location_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Load every traveler pin — the entity is public-read so guests can see them.
  const loadPins = useCallback(async () => {
    try {
      const list = await base44.entities.TravelerPin.list('-created_date', 500);
      setPins(list || []);
    } catch (err) {
      console.error('Failed to load pins', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  // Reverse geocode a clicked point into a friendly place name (best-effort).
  const reverseGeocode = async (lat, lng) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const name = data?.address
        ? [data.address.city || data.address.town || data.address.village || data.address.county, data.address.state]
            .filter(Boolean)
            .join(', ')
        : '';
      return name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    } catch {
      return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleMapClick = async (latlng) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in to drop a pin',
        description: 'Create an account or sign in to mark where you visited from.',
        variant: 'default',
      });
      return;
    }
    setPending(latlng);
    setForm({ name: '', comment: '', location_name: '' });
    const place = await reverseGeocode(latlng.lat, latlng.lng);
    setForm((f) => ({ ...f, location_name: place }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data[0]) {
        mapRef.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 6, { duration: 1.2 });
      } else {
        toast({ title: 'Location not found', description: 'Try a city or place name.', variant: 'default' });
      }
    } catch {
      toast({ title: 'Search failed', description: 'Please try again.', variant: 'default' });
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pending) return;
    if (!form.name.trim() && !form.comment.trim()) {
      toast({
        title: 'Add a name or comment',
        description: 'Your pin needs at least a name or a message.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      let photo_url = '';
      if (photoFile) {
        setUploading(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
          photo_url = file_url;
        } catch (err) {
          console.error('Photo upload failed', err);
          toast({ title: 'Photo upload failed', description: 'Saving your pin without a photo.', variant: 'default' });
        } finally {
          setUploading(false);
        }
      }
      const created = await base44.entities.TravelerPin.create({
        name: form.name.trim(),
        comment: form.comment.trim(),
        lat: pending.lat,
        lng: pending.lng,
        location_name: form.location_name.trim(),
        photo_url,
      });
      setPins((prev) => [created, ...prev]);
      clearPhoto();
      setPending(null);
      setForm({ name: '', comment: '', location_name: '' });
      toast({ title: 'Pin dropped!', description: 'Thanks for marking your spot on the map.', variant: 'default' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Could not save pin', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: 'Flavor Isle Traveler Map',
      text: 'See where Flavor Isle guests come from — and drop your own pin!',
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied!', description: 'Share the map with your friends.', variant: 'default' });
      }
    } catch {
      // user cancelled share — no action needed
    }
  };

  const closeForm = () => {
    clearPhoto();
    setPending(null);
    setForm({ name: '', comment: '', location_name: '' });
  };

  // Pink (+) button — drops a pin at the user's current location, or nudges
  // them to tap the map if geolocation isn't available.
  const handleAddPin = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in to drop a pin',
        description: 'Create an account or sign in to mark where you visited from.',
        variant: 'default',
      });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPending(latlng);
          setForm({ name: '', comment: '', location_name: '' });
          if (mapRef) mapRef.flyTo([latlng.lat, latlng.lng], 6, { duration: 1 });
          const place = await reverseGeocode(latlng.lat, latlng.lng);
          setForm((f) => ({ ...f, location_name: place }));
        },
        () => {
          toast({
            title: 'Tap the map to drop your pin',
            description: "We couldn't find your location — tap anywhere on the map to mark your hometown.",
            variant: 'default',
          });
        }
      );
    } else {
      toast({
        title: 'Tap the map to drop your pin',
        description: 'Tap anywhere on the map to mark your hometown.',
        variant: 'default',
      });
    }
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Navbar />

      {/* Storytelling hero */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <h1 className="font-heading text-4xl sm:text-5xl text-midnight-cherry leading-none">
          THE FLAVOR ISLE TRAVELER'S LOG
        </h1>
        <div className="mt-5 space-y-4 text-sm sm:text-base text-obsidian-roast/80 leading-relaxed text-left">
          <p>
            Since 1964, people have been rolling into Smiths Grove from every direction — locals, road-trippers, and travelers who heard about the little diner with big energy. This map shows just how far the Flavor Isle story reaches. Every pin is a hometown, a memory, and a reminder that <strong>They Not Like Us</strong> for a reason.
          </p>
          <p>
            <strong>This map is proof.</strong> Every pin, every hometown, every traveler who finds their way to our window adds another chapter to a story that started right here and now stretches across the world. You're not just stopping for a burger or a shake — you're joining a legacy that's been growing for over sixty years.
          </p>
          <p>
            Add your hometown to the Flavor Isle Traveler's Log and see how visitors from across the country — and around the world — connect back to our corner of Kentucky. Tap the pink (+) button, drop a photo, and leave your mark on the map.
          </p>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={handleAddPin}
            className="btn-cherry chrome-hover inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-heading tap-44"
          >
            <Plus size={18} /> Add My Hometown
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-heading text-obsidian-roast border border-border rounded-full bg-white hover:bg-vanilla-malt transition-colors tap-44"
          >
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a city or place to fly there…"
              className="w-full pl-9 pr-3 py-2.5 rounded-full border border-border bg-white text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="btn-cherry chrome-hover px-5 py-2.5 text-sm font-heading tap-44 inline-flex items-center gap-2 disabled:opacity-60"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Go
          </button>
        </form>
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
        <div className="rounded-t-3xl px-5 py-4 text-white" style={{ backgroundColor: '#63B7E2' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg leading-none">Where Our Fans Are From</h2>
              <p className="text-xs text-white/90 mt-1">From Smiths Grove to the World! 🌎 Tap the pink (+) button to drop a pin on your hometown.</p>
            </div>
            <span className="text-xs text-white/80 font-body hidden sm:block whitespace-nowrap">{pins.length} pins</span>
          </div>
        </div>
        <div className="relative rounded-b-3xl overflow-hidden shadow-float-lg border border-t-0 border-border" style={{ height: '70vh', minHeight: '420px' }}>
          <MapContainer
            center={HOME_CENTER}
            zoom={3}
            minZoom={2}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
            ref={setMapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} disabled={false} />
            <InvalidateSizeOnMount />

            {pins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon}>
                <Popup>
                  <div className="min-w-[180px]">
                    <div className="font-heading text-base text-obsidian-roast leading-tight">
                      {pin.name || 'Anonymous traveler'}
                    </div>
                    {pin.location_name && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin size={10} /> {pin.location_name}
                      </div>
                    )}
                    {pin.photo_url && (
                      <img src={pin.photo_url} alt={pin.name || 'Traveler'} className="mt-2 rounded-lg w-full h-24 object-cover" />
                    )}
                    {pin.comment && (
                      <p className="text-sm text-obsidian-roast mt-2 leading-snug">{pin.comment}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Live preview of the pin being placed */}
            {pending && (
              <Marker position={[pending.lat, pending.lng]} icon={pinIcon} />
            )}
          </MapContainer>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-vanilla-malt/60 z-[500] pointer-events-none">
              <Loader2 className="animate-spin text-midnight-cherry" size={32} />
            </div>
          )}

          {!isAuthenticated && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] glass-back px-4 py-2.5 flex items-center gap-2 text-sm text-obsidian-roast font-body max-w-[90%]">
              <LogIn size={15} className="text-midnight-cherry flex-shrink-0" />
              <span>Sign in to drop your pin.</span>
            </div>
          )}

          {/* Pink (+) floating button */}
          <button
            onClick={handleAddPin}
            className="absolute bottom-5 right-5 z-[500] w-14 h-14 rounded-full flex items-center justify-center shadow-float-lg transition-transform hover:scale-105 active:scale-95 tap-44"
            style={{ backgroundColor: '#E0218A' }}
            aria-label="Add your pin"
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>

        {/* Pin counter */}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles size={14} className="text-smashie-yellow" />
          <span>{pins.length} traveler{pins.length !== 1 ? 's' : ''} on the map</span>
        </div>
      </div>

      {/* Hungry CTA */}
      <section className="bg-midnight-cherry text-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl leading-none">Hungry? Let's Fix That!</h2>
          <p className="mt-3 text-sm text-white/85">Order online for pickup, delivery, or dine-in. Hot food, fast.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 mt-5 bg-white text-midnight-cherry font-heading px-7 py-3 rounded-full text-sm hover:bg-white/90 transition-colors tap-44"
          >
            <UtensilsCrossed size={16} /> Order Now
          </Link>
        </div>
      </section>

      {/* Info cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid gap-6 sm:grid-cols-3">
        <InfoCard
          icon={<Compass size={22} />}
          title="Coming Through Smiths Grove"
          body="Everything you need to know before you roll into Flavor Isle — hours, location, parking, and what to expect when you pull up to Smiths Grove's favorite stop since 1964."
          cta="Visit Us"
          to="/contact"
        />
        <InfoCard
          icon={<MapPinned size={22} />}
          title="See What Smiths Grove Has to Offer"
          body="Explore the local shops, attractions, and hidden gems that make Smiths Grove a must-stop town. From antiques to vineyards to family-owned favorites, here's everything worth checking out while you're here."
          cta="Discover Smiths Grove"
          to="/contact"
        />
        <InfoCard
          icon={<Sparkles size={22} />}
          title="Find Out Why"
          body="Discover how a small Kentucky diner became a coast-to-coast favorite. Explore the stories, travelers, and traditions that turned Flavor Isle into a destination since 1964."
          cta="Hometown Fame"
          to="/menu"
        />
      </section>

      {/* Add-pin form */}
      {pending && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-float-lg w-full sm:max-w-md flex flex-col overflow-hidden animate-float-up">
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-heading text-xl text-obsidian-roast">Drop Your Pin</h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin size={11} />
                  {reverseGeocoding ? 'Finding your location…' : (form.location_name || `${pending.lat.toFixed(3)}, ${pending.lng.toFixed(3)}`)}
                </p>
              </div>
              <button onClick={closeForm} className="tap-44 flex items-center justify-center hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 safe-bottom">
              <div>
                <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Your Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Alex"
                  maxLength={60}
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-border bg-vanilla-malt text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
                />
              </div>
              <div>
                <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Message</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Leave a note for Flavor Isle…"
                  maxLength={240}
                  rows={3}
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-border bg-vanilla-malt text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Photo (optional)</label>
                {photoPreview ? (
                  <div className="mt-1.5 relative rounded-xl overflow-hidden">
                    <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover" />
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 tap-44 flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1.5 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-border rounded-xl py-4 cursor-pointer hover:border-midnight-cherry transition-colors">
                    <Camera size={20} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add a photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Add a name <em>or</em> a message — at least one is needed to save your pin.
              </p>
              <button
                type="submit"
                disabled={submitting || reverseGeocoding || uploading}
                className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                {submitting ? 'Saving…' : 'Add My Pin'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, title, body, cta, to }) {
  return (
    <div className="card-diner p-6 flex flex-col">
      <div className="w-11 h-11 rounded-full bg-midnight-cherry/10 text-midnight-cherry flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-heading text-lg text-obsidian-roast leading-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed flex-1">{body}</p>
      <Link to={to} className="mt-4 inline-flex items-center gap-1.5 text-sm font-heading text-midnight-cherry hover:gap-2.5 transition-all">
        {cta} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}