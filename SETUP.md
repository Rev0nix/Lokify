# Lokify setup

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings. Run `supabase/schema.sql` in the Supabase SQL Editor to create the `issues` table and authenticated-user row-level security policies. If you already have an `issues` table, confirm that it has `id`, `title`, `description`, `category`, `latitude`, `longitude`, `user_id`, and `created_at` columns and equivalent RLS policies.

Run the app with `npm run dev`. Users can sign in or create an account with their Supabase email and password. If email confirmation is enabled in Supabase Auth, users must confirm their email address before signing in.

## EmailJS confirmations

Create an EmailJS service and template, then set `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY` in `.env`. Configure the template recipient as `{{to_email}}`. The template data includes `{{issue_title}}`, `{{issue_category}}`, `{{issue_description}}`, and `{{issue_id}}`. Restart Vite after changing environment variables.

Email delivery runs after the issue is saved, so mail failure does not discard the report. The EmailJS public key is intended for browser use; configure allowed origins and template restrictions in the EmailJS dashboard.