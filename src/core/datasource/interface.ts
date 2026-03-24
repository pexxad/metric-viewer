import type { Dataset } from "../data/types";

export interface DataSourceQuery {
  identifier: string;
  params?: Record<string, string>;
}

export interface DataSourcePlugin {
  id: string;
  name: string;
  requiresAuth: boolean;
  fetchDataset(query: DataSourceQuery): Promise<Dataset>;
}
