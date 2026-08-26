import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp, AlertCircle, Zap, Clock, CalendarClock, ShoppingBag, Utensils, Bike, ArrowRight, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useLiveStatus from '@/hooks/useLiveStatus';
import { BUSYNESS_STAGES } from '@/lib/busynessStages';
import OrderStatusStages from '@/components/OrderStatusStages';
import WhatToExpectVideo from '@/components/WhatToExpectVideo';

const ICONS = { Flame, TrendingUp, AlertCircle, Zap };

const ORDER_TYPES = [
  { id: 'pickup', label: 'Pickup', Icon: ShoppingBag, tip: 'Grab it hot off the grill.' },
  { id: 'dine_in', label: 'Dine-In', Icon: Utensils, tip: 'Pull up a seat and dig in.' },
  { id: 'delivery', label: 'Delivery', Icon: Bike, tip: 'We bring it to your door.' },
];

const LEVEL_BLURBS = {
  'Running Smooth': 'The board is clear and the grill is hot. Orders start right away and are typically ready in about 20 minutes.',
  'A Little Busy': 'A steady stream of orders is coming in. Expect about a 30-minute wait from the time you place your order.',
  'Busy': 'The kitchen is cooking at full tilt. Plan on a 35–40 minute wait — scheduling ahead is a smart move.',
  'Slammed': "We're in the weeds. Orders can take up to 60 minutes. Schedule a later pickup time whenever you can.",
};

export default function BusynessGuide() {
  const { level, waitMin, isClosed, closingSoon, closeTime } = useLiveStatus();

  useEffect(() => {
    base44.analytics.track({ eventName: 'busyness_guide_viewed' });
  }, []);

  const currentLevelName = isClosed ? 'Closed' : level?.level;
  const idleMsg = 'Things are moving — order anytime and we will get it fired up.';

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="font-heading text-midnight-cherry text-sm tracking-[0.3em] mb-2">FLAVOR ISLE</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">What to Expect</h1>
          <p className="text-muted-foreground mt-3 text-base max-w-xl mx-auto">
            We fire everything fresh to order. The kitchen status below updates live so you know exactly how long your food will take — and the best way to order.
          </p>
        </div>

        {/* Promo video — three 8-second clips playing back-to-back as one tour */}
        <WhatToExpectVideo />

        {/* Live status card */}
        <div className={`card-diner p-6 mb-8 ${isClosed ? 'ring-2 ring-red-200' : ''}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isClosed ? 'bg-red-100 text-red-700' : level ? `${level.bgClass} ${level.textClass}` : 'bg-muted text-muted-foreground'
              }`}>
                {isClosed ? <Clock size={24} /> : level && ICONS[level.icon] ? React.createElement(ICONS[level.icon], { size: 24 }) : <Clock size={24} />}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Right now</p>
                <p className="font-heading text-2xl text-obsidian-roast leading-none">
                  {isClosed ? 'Closed' : level?.level || 'Checking…'}
                </p>
              </div>
            </div>
            {!isClosed && waitMin > 0 && (
              <div className="text-right">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. wait</p>
                <p className="font-heading text-xl text-midnight-cherry">~{waitMin} min</p>
              </div>
            )}
          </div>
          {isClosed ? (
            <p className="mt-4 text-sm text-muted-foreground">
              We're closed right now. Online ordering opens back up before we open for pickup — check back soon.
            </p>
          ) : closingSoon && closeTime ? (
            <p className="mt-4 text-sm font-semibold text-midnight-cherry">
              Closing soon · kitchen closes at {closeTime}. Order now to get it in tonight.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {level?.urgency || idleMsg}
            </p>
          )}
        </div>

        {/* Level breakdown */}
        <h2 className="font-heading text-xl text-obsidian-roast mb-4">The four kitchen levels</h2>
        <div className="space-y-3 mb-10">
          {BUSYNESS_STAGES.map((stage) => {
            const Icon = ICONS[stage.icon] || Clock;
            const isCurrent = stage.level === currentLevelName;
            return (
              <div
                key={stage.level}
                className={`card-diner p-5 ${isCurrent ? 'ring-2 ring-midnight-cherry' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${stage.bgClass} ${stage.textClass}`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <h3 className="font-heading text-lg text-obsidian-roast">{stage.level}</h3>
                      <span className="text-sm font-semibold text-patina-mint">{stage.waitRange}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{LEVEL_BLURBS[stage.level]}</p>
                    {isCurrent && (
                      <span className="inline-block mt-2 text-xs font-heading text-midnight-cherry bg-midnight-cherry/10 px-2.5 py-1 rounded-full">
                        This is right now
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <h2 className="font-heading text-xl text-obsidian-roast mb-4">Tips for a smooth order</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          <TipCard Icon={CalendarClock} title="Schedule ahead">
            When it's busy or slammed, pick a later time slot at checkout. Your order goes into the queue for that window so you skip the wait.
          </TipCard>
          <TipCard Icon={Clock} title="Order before the rush">
            Lunch (11:30a–1p) and dinner (5–7p) are our peak windows. Ordering just before or after beats the line.
          </TipCard>
          <TipCard Icon={ShoppingBag} title="Pickup is fastest">
            Pickup gets you food the quickest. Delivery adds drive time on top of the kitchen wait.
          </TipCard>
          <TipCard Icon={Info} title="Fresh, never frozen">
            Every burger is smashed to order and every shake is spun fresh — that's why wait times flex with how many orders are on the board.
          </TipCard>
        </div>

        {/* Order type explainer */}
        <h2 className="font-heading text-xl text-obsidian-roast mb-4">How to order</h2>
        <div className="grid gap-3 mb-10">
          {ORDER_TYPES.map(({ id, label, Icon, tip }) => (
            <div key={id} className="card-diner p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-midnight-cherry/10 text-midnight-cherry flex items-center justify-center flex-shrink-0">
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-base text-obsidian-roast">{label}</h3>
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cook to order explainer */}
        <div className="card-diner p-6 mb-10 bg-midnight-cherry/5 border border-midnight-cherry/15">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-midnight-cherry text-white flex items-center justify-center flex-shrink-0">
              <Flame size={24} />
            </div>
            <div>
              <h2 className="font-heading text-xl text-obsidian-roast mb-1.5">Why we cook to order</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nothing here sits under a heat lamp. Every burger is smashed fresh on the flat-top the second your ticket hits the kitchen, every shake is spun to order, and every side is dropped in the fryer when you order it — not a minute before.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                That's the trade-off: <span className="font-semibold text-obsidian-roast">a few extra minutes for food that's genuinely hot, crisp, and made just for you.</span> The live kitchen status above tells you how long the board is right now, so you always know before you order.
              </p>
            </div>
          </div>
        </div>

        {/* Order tracking stages */}
        <div className="mb-10">
          <OrderStatusStages />
        </div>

        {/* CTA */}
        {!isClosed && (
          <Link
            to="/menu"
            className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2"
          >
            Start Your Order <ArrowRight size={16} />
          </Link>
        )}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Wait times are estimates based on live kitchen load and can shift quickly. Thanks for your patience — we're cooking as fast as we can.
        </p>
      </div>
    </div>
  );
}

function TipCard({ Icon, title, children }) {
  return (
    <div className="card-diner p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={16} className="text-midnight-cherry flex-shrink-0" />
        <h3 className="font-heading text-sm text-obsidian-roast">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}