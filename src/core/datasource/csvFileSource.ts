import { parseCsv } from "../data/csvParser";
import type { Dataset } from "../data/types";
import type { DataSourcePlugin, DataSourceQuery } from "./interface";

/**
 * CSV file data source plugin.
 * The query.identifier is used as the dataset ID.
 * The CSV text must be passed in query.params.csvText.
 */
export const csvFileSource: DataSourcePlugin = {
  id: "csv-file",
  name: "CSV File",
  requiresAuth: false,

  async fetchDataset(query: DataSourceQuery): Promise<Dataset> {
    const csvText = query.params?.csvText;
    if (!csvText) {
      throw new Error("csvText is required in query.params");
    }
    return parseCsv(csvText, query.identifier, query.params?.name);
  },
};
