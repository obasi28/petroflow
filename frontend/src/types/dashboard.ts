export interface DashboardKPIs {
  total_wells: number;
  active_wells: number;
  avg_oil_rate: number | null;
  total_eur: number | null;
  oil_trend: number | null;
}

export interface ProductionSummaryPoint {
  date: string;
  oil: number;
  gas: number;
  water: number;
}
