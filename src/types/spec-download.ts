// Entity Type: spec_download
// From PROJECT-SPEC.md Gate 1
// Owner: system | Parent: spec_project | States: created (append-only)

import type { SpecDownload as DBSpecDownload, SpecDownloadStatus } from './database';

export type { SpecDownloadStatus };

export interface SpecDownload extends DBSpecDownload {}

// Insert type
export type SpecDownloadInsert = Omit<
  SpecDownload,
  'id' | 'created_at' | 'updated_at' | 'downloaded_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  downloaded_at?: string;
};

// No update type (append-only)

// Download statistics
export interface DownloadStats {
  total_downloads: number;
  last_downloaded_at: string | null;
  total_zip_size_bytes: number;
}
