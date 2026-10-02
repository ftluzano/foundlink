import React, { useState } from 'react';
import { ShieldCheck, Lock, ExternalLink, X } from 'lucide-react';

export const DataPrivacyNotice: React.FC = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-white font-medium">RA 10173 Protected:</span>
          <span>Confidential serial numbers and verification answers are shielded from public view until authorized custodian inspection.</span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-white p-0.5"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
