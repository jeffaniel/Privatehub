-- ============================================
-- COMPLETE DATABASE SETUP FOR LINCOLNVOICE
-- ============================================
-- This file contains all database tables, triggers, and policies
-- Run this once in Supabase SQL Editor to set up the entire database

-- ============================================
-- PART 1: SUBMISSIONS SYSTEM
-- ============================================

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('suggestion', 'voiceout')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'responded', 'closed')),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 2: ADMIN SYSTEM
-- ============================================

-- Create admin table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admins
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);

-- ============================================
-- PART 3: SECURITY TABLES
-- ============================================

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure', 'suspicious')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account lockouts table
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT DEFAULT 'too_many_failed_attempts',
  locked_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MFA table
CREATE TABLE IF NOT EXISTS admin_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret TEXT,
  backup_codes TEXT[],
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT UNIQUE NOT NULL,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT FALSE,
  last_cleanup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 4: INVITATION CODES
-- ============================================

CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  notes TEXT
);

-- ============================================
-- PART 5: ORGANIZATION SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Lincoln Voice',
  description TEXT DEFAULT 'Anonymous feedback platform',
  contact_email TEXT DEFAULT 'admin@lincolnvoice.edu',
  website TEXT DEFAULT '',
  notifications_json JSONB DEFAULT '{"emailOnNewSubmission": true, "emailOnUrgentReport": true, "dailyDigest": false, "weeklyReport": true}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 6: INDEXES
-- ============================================

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_tracking_code ON submissions(tracking_code);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_comments_submission_id ON comments(submission_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_admin_id ON account_lockouts(admin_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON account_lockouts(locked_until);
CREATE INDEX IF NOT EXISTS idx_admin_mfa_admin_id ON admin_mfa(admin_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_admin_id ON security_alerts(admin_id);

-- Invitation codes indexes
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON public.invitation_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires_at ON public.invitation_codes(expires_at);

-- ============================================
-- PART 7: FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update submission vote counts
CREATE OR REPLACE FUNCTION update_submission_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.vote_type = 'up') THEN
      UPDATE submissions SET upvotes = upvotes + 1 WHERE id = NEW.submission_id;
    ELSIF (NEW.vote_type = 'down') THEN
      UPDATE submissions SET downvotes = downvotes + 1 WHERE id = NEW.submission_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.vote_type = 'up') THEN
      UPDATE submissions SET upvotes = upvotes - 1 WHERE id = OLD.submission_id;
    ELSIF (OLD.vote_type = 'down') THEN
      UPDATE submissions SET downvotes = downvotes - 1 WHERE id = OLD.submission_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_submission_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE submissions SET comments_count = comments_count + 1 WHERE id = NEW.submission_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE submissions SET comments_count = comments_count - 1 WHERE id = OLD.submission_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create admin records when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'is_admin')::boolean = true THEN
    INSERT INTO public.admins (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  locked BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM account_lockouts
    WHERE email = p_email
    AND locked_until > NOW()
  ) INTO locked;
  
  RETURN locked;
END;
$$ LANGUAGE plpgsql;

-- Function to lock account after failed attempts
CREATE OR REPLACE FUNCTION check_and_lock_account()
RETURNS TRIGGER AS $$
DECLARE
  failed_count INTEGER;
  lockout_duration INTERVAL := '15 minutes';
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM login_attempts
  WHERE email = NEW.email
  AND success = FALSE
  AND created_at > NOW() - INTERVAL '15 minutes';
  
  IF failed_count >= 5 THEN
    INSERT INTO account_lockouts (email, locked_until, reason)
    VALUES (NEW.email, NOW() + lockout_duration, 'too_many_failed_attempts')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO security_alerts (alert_type, severity, description, metadata)
    VALUES (
      'account_locked',
      'high',
      'Account locked due to multiple failed login attempts',
      jsonb_build_object('email', NEW.email, 'failed_attempts', failed_count)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate invitation codes
CREATE OR REPLACE FUNCTION public.validate_invitation_code(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  SELECT * INTO v_code_record
  FROM public.invitation_codes
  WHERE code = p_code
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  IF v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN FALSE;
  END IF;

  UPDATE public.invitation_codes
  SET 
    current_uses = current_uses + 1,
    used_at = CASE 
      WHEN used_at IS NULL THEN NOW() 
      ELSE used_at 
    END,
    used_by = CASE 
      WHEN used_by IS NULL AND p_user_id IS NOT NULL THEN p_user_id 
      ELSE used_by 
    END,
    is_active = CASE 
      WHEN current_uses + 1 >= max_uses THEN FALSE 
      ELSE is_active 
    END
  WHERE id = v_code_record.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: TRIGGERS
-- ============================================

-- Trigger for submission updated_at
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at 
  BEFORE UPDATE ON submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for admin updated_at
DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at 
  BEFORE UPDATE ON public.admins 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for vote counts
DROP TRIGGER IF EXISTS tr_update_submission_vote_counts ON votes;
CREATE TRIGGER tr_update_submission_vote_counts
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_vote_counts();

-- Trigger for comments count
DROP TRIGGER IF EXISTS tr_update_submission_comments_count ON comments;
CREATE TRIGGER tr_update_submission_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_comments_count();

-- Trigger to auto-create admin records
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_admin();

-- Trigger for account lockout
DROP TRIGGER IF EXISTS tr_check_account_lockout ON login_attempts;
CREATE TRIGGER tr_check_account_lockout
  AFTER INSERT ON login_attempts
  FOR EACH ROW
  WHEN (NEW.success = FALSE)
  EXECUTE FUNCTION check_and_lock_account();

-- ============================================
-- PART 9: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Submissions policies
DROP POLICY IF EXISTS "Allow public read access to active submissions" ON submissions;
CREATE POLICY "Allow public read access to active submissions" 
  ON submissions FOR SELECT 
  TO public 
  USING (status IN ('pending', 'under_review', 'responded'));

DROP POLICY IF EXISTS "Admins can view all submissions" ON submissions;
CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public insert to submissions" ON submissions;
CREATE POLICY "Allow public insert to submissions" 
  ON submissions FOR INSERT 
  TO public 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage submissions" ON submissions;
CREATE POLICY "Admins can manage submissions"
  ON submissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comments policies
DROP POLICY IF EXISTS "Allow public read access to comments" ON comments;
CREATE POLICY "Allow public read access to comments" 
  ON comments FOR SELECT 
  TO public 
  USING (EXISTS (
    SELECT 1 FROM submissions 
    WHERE submissions.id = comments.submission_id 
    AND submissions.status IN ('pending', 'under_review', 'responded')
  ));

DROP POLICY IF EXISTS "Admins can view/manage comments" ON comments;
CREATE POLICY "Admins can view/manage comments"
  ON comments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert to comments" ON comments;
CREATE POLICY "Allow public insert to comments" 
  ON comments FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Votes policies
DROP POLICY IF EXISTS "Allow public read access to votes" ON votes;
CREATE POLICY "Allow public read access to votes" 
  ON votes FOR SELECT 
  TO public 
  USING (EXISTS (
    SELECT 1 FROM submissions s
    WHERE s.id = votes.submission_id
    AND s.status IN ('pending', 'under_review', 'responded')
  ));

DROP POLICY IF EXISTS "Allow public insert to votes" ON votes;
CREATE POLICY "Allow public insert to votes"
  ON votes FOR INSERT
  TO public 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage votes" ON votes;
CREATE POLICY "Admins can manage votes"
  ON votes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admins policies
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
CREATE POLICY "Admins can view all admins" 
  ON public.admins FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Admins can update own profile" ON public.admins;
CREATE POLICY "Admins can update own profile" 
  ON public.admins FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert admins" ON public.admins;
CREATE POLICY "Service role can insert admins"
  ON public.admins FOR INSERT
  WITH CHECK (true);

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Login attempts policies
DROP POLICY IF EXISTS "Admins can view login attempts" ON login_attempts;
CREATE POLICY "Admins can view login attempts"
  ON login_attempts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can insert login attempts" ON login_attempts;
CREATE POLICY "System can insert login attempts"
  ON login_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Account lockouts policies
DROP POLICY IF EXISTS "Admins can view account lockouts" ON account_lockouts;
CREATE POLICY "Admins can view account lockouts"
  ON account_lockouts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage account lockouts" ON account_lockouts;
CREATE POLICY "Admins can manage account lockouts"
  ON account_lockouts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Security alerts policies
DROP POLICY IF EXISTS "Admins can view security alerts" ON security_alerts;
CREATE POLICY "Admins can view security alerts"
  ON security_alerts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update security alerts" ON security_alerts;
CREATE POLICY "Admins can update security alerts"
  ON security_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invitation codes policies
DROP POLICY IF EXISTS "Admins can view invitation codes" ON public.invitation_codes;
CREATE POLICY "Admins can view invitation codes" 
  ON public.invitation_codes FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id = auth.uid() 
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can create invitation codes" ON public.invitation_codes;
CREATE POLICY "Admins can create invitation codes" 
  ON public.invitation_codes FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id = auth.uid() 
      AND is_active = true
      AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Admins can update invitation codes" ON public.invitation_codes;
CREATE POLICY "Admins can update invitation codes" 
  ON public.invitation_codes FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id = auth.uid() 
      AND is_active = true
      AND role IN ('admin', 'moderator')
    )
  );

-- Organization settings policies
DROP POLICY IF EXISTS "Admins can manage organization settings" ON organization_settings;
CREATE POLICY "Admins can manage organization settings"
  ON organization_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view platform name" ON organization_settings;
CREATE POLICY "Public can view platform name"
  ON organization_settings FOR SELECT
  TO public
  USING (true);

-- ============================================
-- PART 10: INITIAL DATA
-- ============================================

-- Insert default retention policies
INSERT INTO data_retention_policies (resource_type, retention_days, auto_delete) VALUES
  ('submission', 365, FALSE),
  ('audit_log', 90, TRUE),
  ('login_attempt', 30, TRUE),
  ('security_alert', 180, FALSE)
ON CONFLICT (resource_type) DO NOTHING;

-- Insert initial organization settings
INSERT INTO organization_settings (id, name)
SELECT gen_random_uuid(), 'Lincoln Voice'
WHERE NOT EXISTS (SELECT 1 FROM organization_settings);

-- ============================================
-- PART 11: MIGRATE EXISTING AUTH USERS TO ADMINS
-- ============================================
-- This will add any existing auth users with is_admin metadata to the admins table

INSERT INTO public.admins (id, email, role, is_active)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'role', 'admin') as role,
    true as is_active
FROM auth.users
WHERE (raw_user_meta_data->>'is_admin')::boolean = true
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that everything was created successfully

SELECT 'Database setup complete!' as status;
SELECT 'Total admins migrated: ' || COUNT(*)::text as admin_count FROM public.admins;
