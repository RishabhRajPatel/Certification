// Camel-cased shapes returned by the API client (see api.ts toCamel()).

export interface Me {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Intern {
  id: string;
  internCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  college?: string | null;
  course?: string | null;
  role?: string | null;
  department?: string | null;
  startDate: string;
  endDate: string;
  durationLabel?: string | null;
  reportingManager?: string | null;
  stipend?: number | null;
  photoUrl?: string | null;
  status: string;
  createdAt: string;
}

export interface ProgressInfo {
  percent: number;
  totalDays: number;
  daysCompleted: number;
  daysRemaining: number;
  phase: string;
}

export interface Task {
  id: string;
  internId: string;
  title: string;
  isDone: boolean;
  orderIndex: number;
}

export interface HistoryEntry {
  action: string;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

export interface Offer {
  id: string;
  number: string;
  internId: string;
  templateKey: string;
  position: string;
  department?: string | null;
  durationLabel?: string | null;
  joiningDate: string;
  compensationType: string; // UNPAID | FIXED | PERFORMANCE
  stipend?: number | null;
  performanceCriteria?: string | null;
  evaluationFrequency?: string | null;
  issueDate: string;
  authorizedName: string;
  authorizedDesignation: string;
  terms?: string | null;
  status: string;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  emailRecipient?: string | null;
  createdAt: string;
  internName?: string | null;
  internCode?: string | null;
  downloadUrl?: string | null;
  history?: HistoryEntry[];
}

export interface Cert {
  id: string;
  number: string;
  internId: string;
  templateKey: string;
  certificateType: string;
  title: string;
  role: string;
  department?: string | null;
  durationLabel?: string | null;
  workMode?: string | null;
  startDate: string;
  endDate: string;
  performanceRating?: number | null;
  skills?: string | null;
  remarks?: string | null;
  certificateText?: string | null;
  issueDate: string;
  expiresAt?: string | null;
  authorizedName: string;
  authorizedDesignation: string;
  status: string;
  emailStatus?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  emailRecipient?: string | null;
  createdAt: string;
  internName?: string | null;
  internCode?: string | null;
  downloadUrl?: string | null;
  verifyUrl?: string | null;
  isExpired: boolean;
  verificationCount: number;
  lastVerifiedAt?: string | null;
  history?: HistoryEntry[];
}

export interface InternDetail extends Intern {
  progress: ProgressInfo;
  tasks: Task[];
  offerLetters: Offer[];
  certificates: Cert[];
}

export interface DocItem {
  id: string;
  type: string;
  title: string;
  number?: string | null;
  internId?: string | null;
  internName?: string | null;
  status: string;
  date: string;
  downloadUrl?: string | null;
  verifyUrl?: string | null;
}

export interface FieldLayout {
  x: number;
  y: number;
  fontSize?: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
  size?: number; // QR box size, as a fraction of min(page width, height)
}

export interface Template {
  id: string;
  type: string;
  key: string;
  name: string;
  description?: string | null;
  accent?: string | null;
  isDefault: boolean;
  isCustom: boolean;
  backgroundType?: "IMAGE" | "PDF" | null;
  backgroundUrl?: string | null;
  bgWidthPt?: number | null;
  bgHeightPt?: number | null;
  layout?: Record<string, FieldLayout> | null;
}

export interface Settings {
  id: string;
  companyName: string;
  companyLogoUrl?: string | null;
  companyAddress?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  letterPrefix: string;
  certPrefix: string;
  internPrefix: string;
  signatureName: string;
  signatureDesignation: string;
  signatureImageUrl?: string | null;
  stampImageUrl?: string | null;
  defaultOfferTemplate: string;
  defaultCertTemplate: string;
  brandColor: string;
  certEmailAutoSend: boolean;
  certEmailSubject: string;
  certEmailAttachPdf: boolean;
  certEmailIncludeVerifyLink: boolean;
  offerEmailAutoSend: boolean;
  offerEmailSubject: string;
  offerEmailAttachPdf: boolean;
  offerLetterTemplate: string;
  updatedAt: string;
}

export interface SessionInfo {
  jti: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface Dashboard {
  totalInterns: number;
  offersGenerated: number;
  certificates: number;
  activeInternships: number;
  statusCounts: Record<string, number>;
  recentInterns: {
    id: string;
    fullName: string;
    internCode: string;
    role?: string | null;
    status: string;
    photoUrl?: string | null;
  }[];
  recentOffers: RecentDoc[];
  recentCertificates: RecentDoc[];
}

export interface RecentDoc {
  id: string;
  number: string;
  internName: string;
  subtitle?: string | null;
  status: string;
  date: string;
}

export interface Verify {
  valid: boolean;
  status: string;
  number: string;
  message: string;
  title?: string | null;
  internName?: string | null;
  role?: string | null;
  department?: string | null;
  durationLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  issueDate?: string | null;
  expiresAt?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
  authorizedName?: string | null;
  authorizedDesignation?: string | null;
}
