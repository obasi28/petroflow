export interface ProductionRecord {
  well_id: string;
  production_date: string;
  days_on: number;
  oil_rate: number | null;
  gas_rate: number | null;
  water_rate: number | null;
  cum_oil: number | null;
  cum_gas: number | null;
  cum_water: number | null;
  gor: number | null;
  water_cut: number | null;
  boe: number | null;
  tubing_pressure: number | null;
  casing_pressure: number | null;
  flowing_bhp: number | null;
  choke_size: number | null;
  hours_on: number | null;
  data_source: string;
  is_validated: boolean;
}

export interface ProductionRecordCreate {
  production_date: string;
  days_on?: number;
  oil_rate?: number;
  gas_rate?: number;
  water_rate?: number;
  cum_oil?: number;
  cum_gas?: number;
  cum_water?: number;
  gor?: number;
  water_cut?: number;
  boe?: number;
  tubing_pressure?: number;
  casing_pressure?: number;
  flowing_bhp?: number;
  choke_size?: number;
  hours_on?: number;
}

export interface ProductionBatchCreate {
  records: ProductionRecordCreate[];
}

export interface ProductionStatistics {
  total_records: number;
  first_production_date: string | null;
  last_production_date: string | null;
  peak_oil_rate: number | null;
  peak_gas_rate: number | null;
  current_oil_rate: number | null;
  current_gas_rate: number | null;
  cum_oil: number | null;
  cum_gas: number | null;
  cum_water: number | null;
  avg_oil_rate: number | null;
  avg_gas_rate: number | null;
  avg_water_cut: number | null;
  avg_gor: number | null;
}

export interface ProductionFilters {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface BulkProductionWellSummary {
  well_identifier: string;
  well_name: string | null;
  records_imported: number;
  records_deleted?: number;
  status: "success" | "not_found" | "error";
  error?: string;
}

export interface BulkProductionImportResult {
  file_name: string;
  file_type: string;
  total_wells_detected: number;
  matched_wells: number;
  unmatched_wells: number;
  total_records_imported: number;
  per_well_summary: BulkProductionWellSummary[];
  errors: Array<{ well_identifier: string; message: string }>;
}
