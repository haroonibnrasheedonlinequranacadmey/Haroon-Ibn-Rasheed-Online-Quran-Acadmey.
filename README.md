# Haroon Ibn Rasheed Online Quran Academy

This is the complete static frontend for the academy portal.

## Pages

- `index.html` — secure login
- `forgot-password.html` — password recovery
- `reset-password.html` — create a new password
- Admin: dashboard, teachers, students, courses, schedule, leaves, salaries
- Teacher: dashboard, schedule, students, courses, leaves, salary, group class
- Student: dashboard, schedule, courses, leaves, profile

## Required repository structure

Upload the **contents of this project folder** to the root of your GitHub repository:

```text
index.html
forgot-password.html
reset-password.html
admin-dashboard.html
...
assets/
  app.js
  style.css
  supabase-config.js
  hr-logo.svg
supabase-security-fix.sql
```

Do NOT put the files one extra folder deep.

## Supabase

The browser uses only the Supabase publishable key. Never put a `service_role` or secret key in GitHub.

Project URL and publishable key are in `assets/supabase-config.js`.

## Password reset — one Supabase setting is required

In Supabase:

**Authentication → URL Configuration → Redirect URLs**

Add your exact GitHub Pages reset URL:

`https://haroonibnrasheedonlinequranacadmy.github.io/Haroon-Ibn-Rasheed-Online-Quran-Acadmey-/reset-password.html`

Also set your GitHub Pages site URL as the Site URL if it is not already set.

The password reset page uses Supabase Auth's `resetPasswordForEmail()` and `updateUser()` flow.

## Security SQL

Run `supabase-security-fix.sql` once in Supabase SQL Editor.

It makes new Auth users default to `student` and prevents non-admin users from changing their own role.

## Important

Teacher/student Auth accounts should be created through a trusted admin/server workflow. Never expose a Supabase secret/service-role key in browser code.
