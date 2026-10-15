import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import useSmashieHunt from '@/hooks/useSmashieHunt';
import {
  huntClueText, INSTAGRAM_URL, INSTAGRAM_HANDLE, formatHuntDate, SMASHIE_IMAGES,
} from '@/lib/findSmashie';

// The site-wide Find Smashie band: it advertises the game before it opens and,
// once the hunt is live, carries one small clue line under the headline. The clue
// line is the same shared text every other clue surface shows, so after the day's
// win the whole site switches to "FOUND! ..." together. Outside the October
// window the hook returns show:false and the band removes itself.
export default function FindSmashieBanner() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const hunt = useSmashieHunt();

  if (!hunt?.show) return null;

  const { started, startDate, endDate } = hunt;
  const clueLine = huntClueText(hunt);

  return (
    <div className="w-full bg-midnight-cherry text-white text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-center sm:text-left">
        <div>
          {!started ? (
            <p>
              🎃 <strong>Find Smashie starts {formatHuntDate(startDate)}!</strong> Every day through {formatHuntDate(endDate)}, Smashie
              hides somewhere on this site — first signed-in finder wins a free milkshake or 100 Star
              Rewards points. Follow the daily winner reveals on Instagram&nbsp;
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline font-semibold">{INSTAGRAM_HANDLE}</a>
            </p>
          ) : (
            <p>
              🎃 <strong>Find Smashie!</strong> He's hiding on the site right now — first
              signed-in finder wins a free milkshake or 100 Star Rewards points.
            </p>
          )}
          {clueLine && (
            <p className="mt-1 flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs text-white/90">
              <img
                src={SMASHIE_IMAGES.pumpkin}
                alt=""
                width="14"
                height="14"
                className="h-3.5 w-3.5 object-contain flex-shrink-0"
              />
              <span>{clueLine}</span>
            </p>
          )}
        </div>
        <span className="flex shrink-0 gap-3 items-center">
          <Link to="/find-smashie" className="underline font-semibold">
            Rules &amp; winners
          </Link>
          {!isLoadingAuth && !isAuthenticated && (
            <Link to="/register" className="underline font-semibold">
              Sign up to play
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}