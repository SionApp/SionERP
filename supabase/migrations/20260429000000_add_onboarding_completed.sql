-- Add onboarding_completed flag to users table
-- Users created via invitation or direct creation will have this set to false
-- They must complete their profile before accessing the system
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Set existing users as having completed onboarding (backward compatibility)
UPDATE users SET onboarding_completed = true WHERE onboarding_completed IS NULL;

-- Ensure the auth trigger also sets onboarding_completed based on how the user was created
-- Users created via magic link or direct signup should have onboarding_completed = false
-- unless they were created during setup
