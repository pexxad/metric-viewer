import type { DataSourcePlugin } from "./interface";

const plugins = new Map<string, DataSourcePlugin>();

export function registerSource(plugin: DataSourcePlugin): void {
  plugins.set(plugin.id, plugin);
}

export function getSource(id: string): DataSourcePlugin | undefined {
  return plugins.get(id);
}

export function getAllSources(): DataSourcePlugin[] {
  return Array.from(plugins.values());
}
