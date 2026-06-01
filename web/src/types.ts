export interface SeriesUpdate {
  id: string;
  name: string;
  SERIES_ID: string;
  SEASON_ID: string;
  URL: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
