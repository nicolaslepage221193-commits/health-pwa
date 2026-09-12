# Health App Agent Operating Guide

This repository is a health and fitness planning and tracking application for athletes and trainers. The app is designed as a Next.js-based PWA with workout planning, calendar tracking, history views, and trainer/athlete workflows, backed by Supabase and deployed on Vercel.

## Core project intent

The product should help users:

- plan training blocks and microcycles
- view upcoming sessions and calendars
- track workout execution and athlete progress
- review historical performance data
- manage training plans and exercise libraries
- support coaching workflows for athletes and trainers

The experience should feel focused, disciplined, and performance-oriented while remaining easy to navigate on both desktop and mobile.

## Required reading before code changes

Before modifying code, review:

1. This file
2. The relevant route or feature folder under app/
3. Shared app setup and context files
4. Existing patterns in nearby pages and components
5. The local Next.js guidance in node_modules/next/dist/docs/ if there is any behavior that differs from your training data

## Stack and deployment context

- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Data layer: Supabase
- Deployment: Vercel
- Intended product mode: PWA / mobile-first web application

Environment variables should be treated as a required integration layer for Supabase. The application should fail gracefully when those values are missing, rather than crashing during local development or build-time rendering.

## Repository structure

Key areas to understand before editing:

- app/ - top-level app routes and pages
- app/page.tsx - landing / home experience
- app/layout.tsx - root layout and global shell
- app/components/ - shared UI and layout building blocks
- app/context/ - client-side state and planning context
- app/calendar/ - calendar and scheduling flows
- app/history/ - performance / historical tracking
- app/plan/ - plan hierarchy and planning pages
- app/workout/ - workout execution and library features
- app/supabase.ts - Supabase client initialization
- public/ - static assets for PWA / web resources

When a new feature is being added, prefer existing app patterns over inventing a new pattern.

## Design and UX expectations

This app should feel like a serious fitness product, not a generic dashboard. The agent should favor:

- strong hierarchy and readable information architecture
- clean, modern cards and section layouts
- mobile-first responsiveness
- athletic, performance-oriented language and labels
- clarity over clutter
- realistic health and training data structures
- training-specific terminology that respects athlete/trainer workflows

Avoid placeholder UI that is obviously unfinished unless the task is explicitly exploratory. If placeholder content is used, it should be clearly marked and limited to temporary scaffolding.

## Coding standards

Follow these rules for all work:

- Prefer TypeScript and explicit types for shared structures
- Match the repository’s existing naming conventions and structure
- Keep components readable and modular
- Use the app router conventions established by the repo
- Favor small, intentional changes over broad rewrites
- Preserve accessibility standards: semantic HTML, labels, keyboard access, sensible contrast
- Do not add dead code or unused state just to satisfy a pattern
- Treat localStorage patterns as a valid fallback strategy when backend data is not yet available
- Avoid introducing fragile assumptions about missing data or environment configuration

## Supabase rules

The app integrates with Supabase and should be treated as a first-class dependency.

- Use environment variables such as NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- Do not hardcode production credentials
- If Supabase is unavailable, fail gracefully and keep the app usable in reduced mode
- Respect the existing client initialization conventions in app/supabase.ts
- When creating new features that require data persistence, think through whether the feature is:
  - local-only prototype state
  - Supabase-backed persistent data
  - hybrid local + remote behavior

If the feature requirements are unclear, ask the developer rather than guessing the data model.

## Vercel deployment rules

This application is deployed on Vercel and should be designed with production deployment in mind:

- keep runtime assumptions compatible with Vercel environment behavior
- do not rely on unguarded local-only APIs
- environment variables must be documented or clearly handled
- server/client boundaries must be respected in Next.js
- prefer safe rendering and graceful fallback states when data is missing

The agent should not assume a local-only workflow when a production deployment context exists.

## Page creation workflow

When asked to create or expand a page, use this workflow:

1. Clarify the missing requirements
   - What is the page for?
   - Who is the primary user?
   - What should the page do?
   - What are the key user actions?
   - Should the page be static, interactive, or connected to Supabase?
   - Which route should it live under?

2. Define a clear objective
   - What success looks like
   - The intended sections and interactions
   - The expected user flows

3. Inspect the surrounding code
   - nearby routes
   - layout and styling patterns
   - relevant context providers
   - app component conventions

4. Implement the page
   - match the existing app tone and structure
   - create a complete, usable page experience
   - include clear headings, actions, and responsive layout
   - integrate with context or navigation as needed

5. Audit before finalizing
   - does it meet the user goal?
   - does it fit the app ecosystem?
   - is it responsive and readable?
   - does it have basic accessibility?
   - does it avoid obvious errors or dead code?

6. Publish code to GitHub
   - stage created and modified files
   - commit with a clear, descriptive message
   - push changes to the remote GitHub repository

7. Present for review
   - summarize the page built
   - describe route/file changes
   - share GitHub publication status (commit/branch)
   - state assumptions or open questions
   - note any follow-up work still needed

## When the agent should ask questions

Ask the developer before proceeding if:

- the goal is vague or conflicting
- the route or page placement is not clear
- the page needs a data model that is not defined
- the feature affects athlete/trainer roles or permissions
- the desired UX is not obvious
- the implementation depends on external data shape or business rules

Do not invent product requirements. If a requirement is missing, say so and request guidance.

## Working style for AI agents

The agent should behave like a dependable product engineer for a fitness app:

- thoughtful and surgical
- aware of the app’s mission
- aligned with product and UX quality
- able to work independently once requirements are clear
- careful with assumptions
- willing to stop and ask for missing details

## Example feature categories the repo may include

Pages and features may include:

- training dashboards
- workout execution screens
- plan creation and review pages
- calendar or scheduling views
- athlete history and reporting
- exercise library and template management
- macro or nutrition planning (if relevant to the roadmap)
- trainer-focused overview dashboards

These should all be implemented with fitness-first terminology and user flows relevant to athletic planning and tracking.

## Quality bar for all changes

All code should be:

- production-minded
- visually coherent
- responsive
- accessible
- maintainable
- aligned with the current app structure
- appropriate for athlete and trainer workflows

The final result should not be a superficial scaffold. It should be a meaningful page or feature that can be reviewed and refined, not merely an empty shell.

## Final instruction

When working in this repo, treat it as a serious health and fitness planning product built for real-world athlete and trainer use. Prefer clarity, structure, mobile usability, and realistic product thinking over generic app patterns.

The goal is not just to generate pages, but to create a coherent, usable training system that fits the existing application architecture and is ready for Vercel deployment and real-world use.

