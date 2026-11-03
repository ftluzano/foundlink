import React from 'react';
import { Award, HandHeart, Medal, ShieldCheck } from 'lucide-react';
import { ReputationRecord } from '../types';

interface CommunityDashboardProps {
  reputation: ReputationRecord[];
  userUid: string;
}

export const CommunityDashboard: React.FC<CommunityDashboardProps> = ({ reputation, userUid }) => {
  const currentUser = reputation.find((record) => record.uid === userUid);
  const currentRank = currentUser ? reputation.findIndex((record) => record.uid === userUid) + 1 : null;

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Campus community</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Reputation standings</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>Only confirmed recoveries count</span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your reputation summary">
        <div className="border-l-2 border-emerald-600 pl-3 py-1">
          <p className="text-[11px] font-medium text-slate-500">Your rank</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{currentRank ? `#${currentRank}` : 'Unranked'}</p>
        </div>
        <div className="border-l-2 border-slate-300 pl-3 py-1">
          <p className="text-[11px] font-medium text-slate-500">Points</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{currentUser?.points ?? 0}</p>
        </div>
        <div className="border-l-2 border-emerald-300 pl-3 py-1">
          <p className="text-[11px] font-medium text-slate-500">Verified recoveries</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{currentUser?.verifiedRecoveries ?? 0}</p>
        </div>
        <div className="border-l-2 border-amber-400 pl-3 py-1">
          <p className="text-[11px] font-medium text-slate-500">Items returned</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{currentUser?.returnedSurrenders ?? 0}</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Medal className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold text-slate-900">Top contributors</h2>
          <span className="ml-auto text-[11px] text-slate-500">10 pts per verified recovery · 5 pts per returned item</span>
        </div>

        {reputation.length === 0 ? (
          <div className="border-y border-slate-200 py-10 text-center">
            <HandHeart className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No verified recoveries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Rank</th>
                  <th className="py-2 pr-3 font-semibold">Contributor</th>
                  <th className="py-2 pr-3 text-center font-semibold">Recoveries</th>
                  <th className="py-2 pr-3 text-center font-semibold">Items returned</th>
                  <th className="py-2 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {reputation.map((record, index) => (
                  <tr key={record.uid} className={`border-b border-slate-100 ${record.uid === userUid ? 'bg-emerald-50/70' : ''}`}>
                    <td className="py-3 pr-3 font-bold text-slate-500">{index + 1}</td>
                    <td className="py-3 pr-3 font-semibold text-slate-900">
                      {record.name || 'Campus member'}{record.uid === userUid && <span className="ml-2 text-[10px] font-medium text-emerald-700">You</span>}
                    </td>
                    <td className="py-3 pr-3 text-center text-slate-600">{record.verifiedRecoveries}</td>
                    <td className="py-3 pr-3 text-center text-slate-600">{record.returnedSurrenders}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{record.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};