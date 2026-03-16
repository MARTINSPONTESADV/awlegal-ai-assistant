CREATE TABLE meta_ads_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  account_id text NOT NULL,
  campaign_id text NOT NULL,
  campaign_name text,
  adset_id text,
  adset_name text,
  spend numeric(10,2) DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  reach integer DEFAULT 0,
  cpc numeric(10,4),
  ctr numeric(10,4),
  cpm numeric(10,4),
  leads integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, campaign_id)
);

-- RLS
ALTER TABLE meta_ads_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read meta_ads_insights" ON meta_ads_insights
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can insert meta_ads_insights" ON meta_ads_insights
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can upsert meta_ads_insights" ON meta_ads_insights
  FOR UPDATE TO service_role USING (true);
