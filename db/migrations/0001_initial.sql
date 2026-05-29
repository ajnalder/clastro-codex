CREATE TABLE content_contracts (
  site_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  contract_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id, version)
);

CREATE TABLE content_items (
  site_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  values_json TEXT NOT NULL,
  extra_sections_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (site_id, collection_id, item_id, status)
);

CREATE TABLE published_snapshots (
  site_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id, snapshot_id)
);

CREATE TABLE page_region_values (
  site_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  value_html TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (site_id, page_id, region_id, status)
);

CREATE TABLE media_assets (
  site_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (site_id, asset_id)
);
