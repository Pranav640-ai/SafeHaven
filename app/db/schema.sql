-- SafeHaven AI Database Schema for Supabase PostgreSQL
-- Enables persistent itinerary tracking, risk records, and user feedback

CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    destination_name TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lon DOUBLE PRECISION NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_destination ON itineraries(destination_name);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id TEXT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    highest_risk TEXT NOT NULL,
    assessment_data JSONB NOT NULL,
    assessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_itin ON risk_assessments(itinerary_id);

CREATE TABLE IF NOT EXISTS replan_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id TEXT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    replanner_mode TEXT NOT NULL,
    proposal_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replan_proposals_itin ON replan_proposals(itinerary_id);

CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id TEXT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    feedback JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Setup
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE replan_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public reads and inserts for authenticated or anon client tokens
CREATE POLICY "Allow anon read itineraries" ON itineraries FOR SELECT USING (true);
CREATE POLICY "Allow anon insert itineraries" ON itineraries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read risk_assessments" ON risk_assessments FOR SELECT USING (true);
CREATE POLICY "Allow anon insert risk_assessments" ON risk_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read replan_proposals" ON replan_proposals FOR SELECT USING (true);
CREATE POLICY "Allow anon insert replan_proposals" ON replan_proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert user_feedback" ON user_feedback FOR INSERT WITH CHECK (true);
