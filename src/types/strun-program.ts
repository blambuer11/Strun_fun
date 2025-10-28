// Simplified types for Solana Strun Program interactions

export interface Location {
  lat: number;
  lng: number;
}

export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
}

export interface TaskAccount {
  creator: string;
  assigned: string | null;
  title: string;
  location: Location;
  rewardSol: bigint;
  rewardXp: bigint;
  status: TaskStatus;
  rentUsdc: bigint | null;
}

export interface LandAccount {
  owner: string;
  coordinates: Location;
  rentUsdc: bigint;
}

export interface RunAccount {
  user: string;
  routeHash: number[];
  distance: bigint;
  duration: bigint;
  nftMinted: boolean;
}

export interface UserProfileAccount {
  user: string;
  xp: bigint;
  level: number;
}
