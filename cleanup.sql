-- ============================================
-- DATABASE CLEANUP SCRIPT
-- ============================================
-- ⚠️ WARNING: THIS WILL DELETE ALL DATA IN YOUR DATABASE
-- Run this script to reset your database before running database.sql

-- 1. Drop Tables (CASCADE will remove dependent views, constraints, and triggers)
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.account_lockouts CASCADE;
DROP TABLE IF EXISTS public.admin_mfa CASCADE;
DROP TABLE IF EXISTS public.security_alerts CASCADE;
DROP TABLE IF EXISTS public.data_retention_policies CASCADE;
DROP TABLE IF EXISTS public.invitation_codes CASCADE;
DROP TABLE IF EXISTS public.organization_settings CASCADE;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.update_submission_vote_counts() CASCADE;
DROP FUNCTION IF EXISTS public.update_submission_comments_count() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_account_locked(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_and_lock_account() CASCADE;
DROP FUNCTION IF EXISTS public.validate_invitation_code(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_data() CASCADE;

-- 3. Drop Custom Types (if any were created implicitly or explicitly)
-- (None were explicitly created in our scripts, but checking just in case)

-- 4. Clean up auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Verification
SELECT 'Database cleanup complete' as status;
