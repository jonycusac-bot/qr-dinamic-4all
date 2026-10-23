export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface QRDesignConfig {
  foregroundColor: string;
  backgroundColor: string;
  showWatermark?: boolean;
  watermarkOpacity?: number;
  logoUrl?: string;
  logoSize: number; // 15 to 30 %
  logoMargin: number; // padding px
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  dotStyle: 'square' | 'dots' | 'rounded';
  cornerSquareStyle: 'square' | 'rounded' | 'extra-rounded';
  includeFrame: boolean;
  frameText: string;
  frameColor: string;
  includeClientLabel: boolean;
}

export interface DestinationHistoryItem {
  id: string;
  url: string;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface QRProject {
  id: string;
  clientName: string;
  projectName: string;
  shortCode: string;
  destinationUrl: string; // The current OneDrive or cloud URL
  destinationHistory: DestinationHistoryItem[];
  notes?: string;
  technician: string;
  technicianId?: string;
  status: ProjectStatus;
  qrTargetType?: 'dynamic' | 'direct';
  qrDesign: QRDesignConfig;
  scanCount: number;
  lastScannedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScanEvent {
  id: string;
  projectId: string;
  clientName: string;
  projectName: string;
  shortCode: string;
  scannedAt: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  browser: string;
  city: string;
  country: string;
  ipMasked: string;
  redirectUrl: string;
}

export type UserRole = 'admin' | 'technician' | 'viewer';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  createdAt: string;
  installationsAssigned: number;
}

export interface ScanStatsSummary {
  totalScans: number;
  uniqueProjectsScanned: number;
  scansToday: number;
  scansThisWeek: number;
  mobilePercentage: number;
  deviceBreakdown: { name: string; value: number }[];
  scansOverTime: { date: string; scans: number }[];
  topProjects: { name: string; client: string; scans: number; shortCode: string }[];
}

export interface Branding { name: string; logoUrl: string }
