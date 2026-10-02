export type UserRole = 'student' | 'admin';

export interface UserProfile {
  uid?: string;
  name: string;
  course: string;
  contactNumber: string;
  email: string;
  yearLevel: string;
  studentIdNumber: string;
  role?: UserRole;
  photoBase64?: string;
}

export type ItemType = 'lost' | 'found';

export type ItemStatus =
  | 'Lost'
  | 'Found'
  | 'Potential Match'
  | 'Under Verification'
  | 'Approved'
  | 'Returned'
  | 'Closed';

export type ItemCategory =
  | 'Electronics & Gadgets'
  | 'IDs & Documents'
  | 'Wallets, Purses & Cash'
  | 'Keys & Keychains'
  | 'Bags, Backpacks & Pouches'
  | 'Personal Accessories & Jewelry'
  | 'Books & Study Materials'
  | 'Clothing & Apparel'
  | 'Tumblers & Personal Items'
  | 'Other Belongings';

export interface ReporterInfo {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'staff' | 'visitor' | 'admin';
  phone?: string;
  idNumber?: string;
  isAnonymous?: boolean;
}

export interface ItemRecord {
  id: string;
  type: ItemType;
  title: string;
  category: ItemCategory;
  description: string;
  color: string;
  brand: string;
  location: string;
  dateTime: string; // ISO date-time string
  distinctiveMarks: string;
  secretDetails: string; // Protected under Philippine RA 10173 (Data Privacy Act)
  photoUrl: string | null;
  status: ItemStatus;
  reportedBy: ReporterInfo;
  custodyLocation?: string; // Physical storage location if held (e.g. "Security Office - Cabinet A2")
  matchedItemId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ItemReactionType = 'like' | 'love' | 'support';

export interface ItemComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ItemReaction {
  userId: string;
  userName: string;
  type: ItemReactionType;
  updatedAt: string;
}

export type ClaimStatus =
  | 'Under Verification'
  | 'Approved'
  | 'Rejected'
  | 'Returned';

export interface ClaimRecord {
  id: string;
  foundItemId: string;
  foundItemTitle: string;
  lostItemId?: string;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  claimantIdNumber: string;
  proofDescription: string;
  secretVerificationAnswer: string;
  status: ClaimStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  verificationNotes?: string;
  pickupAppointment?: string;
  handoverDate?: string;
  handoverReceiptId?: string;
  handoverStaffName?: string;
}

export interface MatchFactor {
  factor: string;
  weight?: number;
  scoreWeight?: number;
  matched?: boolean;
  match?: boolean;
  score?: number;
  detail?: string;
}

export interface PotentialMatchRecord {
  id: string;
  lostItemId: string;
  foundItemId: string;
  lostItemTitle: string;
  foundItemTitle: string;
  score: number; // 0 to 100
  matchedAttributes?: string[];
  factors?: MatchFactor[];
  status: 'pending' | 'Pending Review' | 'Confirmed' | 'Dismissed';
  detectedAt?: string;
  createdAt?: string;
}

export type NotificationType =
  | 'match'
  | 'claim'
  | 'status'
  | 'verification'
  | 'handover'
  | 'system'
  | 'match_alert'
  | 'claim_update'
  | 'custody_update';

export interface NotificationRecord {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedItemId?: string;
  relatedClaimId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetId?: string;
  details: string;
  entityType?: string;
  entityId?: string;
  complianceTag?: 'RA_10173_DATA_PRIVACY' | 'CUSTODY_HANDOVER' | 'CASE_MODIFICATION' | string;
}

export interface FirebaseConfigBridge {
  projectId: string;
  apiKey: string;
  authDomain: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  isConnected?: boolean;
  lastSyncAt?: string;
}
