import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Download,
  Flame,
  Radio,
  ShieldCheck,
  Code
} from 'lucide-react';
import { realtimeStore } from '../services/realtimeStore';
import { firebaseConfig } from '../services/firebase';

interface FirebaseBridgeModalProps {
  onClose: () => void;
}

export const FirebaseBridgeModal: React.FC<FirebaseBridgeModalProps> = ({ onClose }) => {
  const [copiedRules, setCopiedRules] = useState(false);
  const [ruleMode, setRuleMode] = useState<'production' | 'test'>('production');

  const productionRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && (
        request.auth.token.admin == true ||
        request.auth.token.role == 'admin' ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
      );
    }

    // 1. Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }

    // 2. Items collection (Campus Lost & Found)
    match /items/{itemId} {
      allow read: if true;
      allow create: if isAuthenticated() && (
        request.resource.data.reportedBy.uid == request.auth.uid ||
        isAdmin()
      );
      allow update: if isAuthenticated() && (
        resource.data.reportedBy.uid == request.auth.uid ||
        isAdmin()
      );
      allow delete: if isAuthenticated() && (
        resource.data.reportedBy.uid == request.auth.uid ||
        isAdmin()
      );
    }

    // 3. Claims collection
    match /claims/{claimId} {
      allow read: if isAuthenticated() && (
        resource.data.claimantUid == request.auth.uid ||
        resource.data.claimant.uid == request.auth.uid ||
        isAdmin()
      );
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (
        resource.data.claimantUid == request.auth.uid ||
        resource.data.claimant.uid == request.auth.uid ||
        isAdmin()
      );
      allow delete: if isAdmin();
    }

    // 4. Matches collection
    match /matches/{matchId} {
      allow read, write: if isAuthenticated();
    }

    // 5. Notifications collection
    match /notifications/{notificationId} {
      allow read, update, delete: if isAuthenticated() && (
        resource.data.recipientUid == request.auth.uid ||
        resource.data.userId == request.auth.uid ||
        isAdmin()
      );
      allow create: if isAuthenticated();
    }

    // 6. Audit Logs collection (Immutable chain of custody)
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    // Fallback for authenticated users
    match /{document=**} {
      allow read, write: if isAuthenticated();
    }
  }
}`;

  const testingRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Open access for prototyping and initial development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const currentRules = ruleMode === 'production' ? productionRules : testingRules;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(currentRules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const handleExportJSON = () => {
    const data = realtimeStore.getFirestoreExportSchema();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foundlink_firestore_${firebaseConfig.projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-white">Firebase &amp; Firestore Security Rules</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live indicator */}
        <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-950">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
            <div>
              <span className="font-bold block">Connected to Project: {firebaseConfig.projectId}</span>
              <span className="text-[11px] text-emerald-800">
                Real-time Firestore snapshot synchronization is active across all browser sessions.
              </span>
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Active Config Parameters */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-700 block">Initialized Credentials:</span>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] space-y-1">
              <div><strong>Project ID:</strong> {firebaseConfig.projectId}</div>
              <div><strong>Auth Domain:</strong> {firebaseConfig.authDomain}</div>
              <div><strong>Storage:</strong> {firebaseConfig.storageBucket}</div>
              <div><strong>App ID:</strong> {firebaseConfig.appId}</div>
            </div>
          </div>

          {/* Firestore Rules notice */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Firestore Security Rules:</span>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setRuleMode('production')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                      ruleMode === 'production'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Production (RBAC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleMode('test')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                      ruleMode === 'test'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Test (Open)
                  </button>
                </div>
                <button
                  onClick={handleCopyRules}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
                </button>
              </div>
            </div>

            <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[10.5px] leading-relaxed overflow-x-auto border border-slate-800 max-h-56">
              {currentRules}
            </pre>
            <p className="text-[11px] text-slate-500">
              Saved in <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">/firestore.rules</code>. You can paste these directly into{' '}
              <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong> or deploy via{' '}
              <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">firebase deploy --only firestore:rules</code>.
            </p>
          </div>

          {/* Export JSON */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 block">Export Firestore Data</span>
              <span className="text-[11px] text-slate-500">Download current campus records as JSON</span>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
