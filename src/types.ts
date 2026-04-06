export interface Bet {
  id: string;
  type: 'single' | 'multi' | 'bingo';
  title: string;
  description: string;
  odds: number;
  matches: Match[];
  analysis: string;
  date: string;
  isVip: boolean;
  result?: 'win' | 'loss' | 'pending';
}

export interface Match {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
  time: string;
}

export interface PerformanceData {
  date: string;
  units: number;
  type: 'single' | 'multi' | 'bingo';
}

export interface UserProfile {
  uid: string;
  email: string;
  isVip: boolean;
  role: 'admin' | 'user';
  subscriptionEnd?: string;
}
