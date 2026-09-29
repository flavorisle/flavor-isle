import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Instagram } from 'lucide-react';

export default function ReviewNextSteps() {
  return (
    <div className="mt-10 pt-8 border-t border-white/20 text-center">
      <p className="text-gray-300 mb-5">Prefer to reach us directly or share your visit?</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/feedback" className="btn-yellow min-h-12 px-6 py-3 text-sm font-heading inline-flex items-center gap-2">
          <MessageCircle size={16} /> Share Feedback
        </Link>
        <Link to="/social-reviews" className="bg-white/10 text-white min-h-12 px-6 py-3 text-sm font-heading inline-flex items-center gap-2 rounded-full hover:bg-white/20 transition-colors">
          <Instagram size={16} /> Post & Earn Points
        </Link>
      </div>
    </div>
  );
}