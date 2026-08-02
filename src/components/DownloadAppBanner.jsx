import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone } from 'lucide-react';

const APP_ICON = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

export default function DownloadAppBanner({ variant = 'full' }) {
  if (variant === 'compact') {
    return (
      <Link
        to="/download"
        className="flex items-center gap-3 rounded-2xl p-3 mt-4 transition-colors hover:opacity-95"
        style={{ backgroundColor: '#003366' }}
      >
        <img src={APP_ICON} alt="Flavor Isle app" className="w-10 h-10 rounded-xl object-contain bg-white/90 p-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-heading text-white text-sm leading-none">GET THE APP</p>
          <p className="text-white/70 text-[11px] mt-0.5">Coming Soon · App Store & Google Play</p>
        </div>
        <ArrowRight size={16} className="text-white/80 flex-shrink-0" />
      </Link>
    );
  }

  return (
    <section className="px-4 sm:px-6 py-12">
      <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-float-lg" style={{ backgroundColor: '#003366' }}>
        <div className="flex flex-col sm:flex-row items-center gap-6 p-8 sm:p-10">
          <img src={APP_ICON} alt="Flavor Isle app icon" className="w-20 h-20 rounded-2xl object-contain bg-white/90 p-1.5 flex-shrink-0" />
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-smashie-yellow/20 border border-smashie-yellow/40 text-smashie-yellow px-3 py-1 rounded-full text-xs font-heading mb-3">
              <span className="w-1.5 h-1.5 bg-smashie-yellow rounded-full animate-pulse" /> COMING SOON
            </div>
            <h2 className="font-heading text-3xl text-white mb-2">Get the Flavor Isle App</h2>
            <p className="text-white/70 text-sm max-w-md mx-auto sm:mx-0">
              Order faster, track in real time, and stack up Star Rewards. Launching soon on the App Store & Google Play.
            </p>
          </div>
          <Link
            to="/download"
            className="btn-yellow chrome-hover px-7 py-3.5 text-sm flex items-center gap-2 flex-shrink-0"
          >
            <Smartphone size={16} /> See Preview
          </Link>
        </div>
      </div>
    </section>
  );
}