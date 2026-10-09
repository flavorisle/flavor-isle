import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useSmashieHunt from '@/hooks/useSmashieHunt';
import {
  SMASHIE_IMAGES, INSTAGRAM_URL, INSTAGRAM_HANDLE, formatHuntDate, HUNT_END_DATE,
} from '@/lib/findSmashie';

/**
 * Promo band for the Find Smashie hide & seek game. Drops onto any page via
 * <FindSmashiePromo />. It teases the game during the advertising window,
 * switches to the live hunt (with today's hint) once it opens, and renders
 * nothing after the last hunt day — so no cleanup is needed afterwards.
 */
export default function FindSmashiePromo() {
  const hunt = useSmashieHunt();

  if (!hunt || !hunt.show) return null;

  const { winner, hint, phase, started, startDate } = hunt;
  const startLabel = formatHuntDate(startDate);
  const endLabel = formatHuntDate(HUNT_END_DATE);

  return (
    <section className="px-4 sm:px-6 py-12">
      <div className="max-w-5xl mx-auto rounded-3xl bg-patina-mint text-white shadow-float-lg overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-6 p-6 sm:p-9">
          <div className="flex justify-center">
            <img
              src={phase === 'vampire' ? SMASHIE_IMAGES.vampire : SMASHIE_IMAGES.pumpkin}
              alt={phase === 'vampire' ? 'Vampire Smashie' : 'Smashie in his pumpkin costume'}
              loading="lazy"
              className="w-28 sm:w-40 object-contain drop-shadow-lg"
            />
          </div>
          <div className="sm:col-span-2 text-center sm:text-left">
            <p className="font-heading text-smashie-yellow tracking-widest uppercase">
              Halloween Hide &amp; Seek
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl leading-none mt-1">
              {started ? 'Find Smashie!' : `Find Smashie Starts ${startLabel}!`}
            </h2>
            <p className="text-sm sm:text-base text-white/85 mt-3 leading-relaxed">
              {!started
                ? `Every day from ${startLabel} through ${endLabel}, Smashie hides somewhere on the site in his Halloween costume. The first signed-in player to spot him wins a free milkshake or 100 Star Rewards points.`
                : winner
                  ? `Smashie was found by ${winner.name || 'a lucky finder'} today. A brand-new hiding spot appears tomorrow at open.`
                  : "He's hiding somewhere on the site right now. The first signed-in player to spot him wins a free milkshake or 100 Star Rewards points."}
            </p>
            {started && !winner && hint && (
              <p className="text-sm font-semibold text-smashie-yellow mt-2">
                🔎 Today's hint: {hint}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-3 mt-5">
              <Link
                to="/find-smashie"
                className="btn-yellow chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm"
              >
                {started ? 'Start Hunting' : 'See How It Works'} <ArrowRight size={16} />
              </Link>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold underline text-white/90"
              >
                Winners daily on {INSTAGRAM_HANDLE}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}