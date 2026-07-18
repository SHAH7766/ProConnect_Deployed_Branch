---
name: fix-home-jsx
description: Fix broken references, missing hooks, and syntax errors in Home.jsx.
metadata:
  type: project
---

# Fix Home.jsx

**Why:** The `Home.jsx` component has broken JSX (unclosed tags) and references undefined variables for scroll animations (`heroRef`, `heroVisible`, etc.) because the `useScrollAnimation` hook is not implemented/called. This causes runtime errors and rendering failures. The 500 error in the console may be related to API failures or unexpected component behavior due to these errors.

**How to apply:**
1. Properly initialize the `useScrollAnimation` hook for the hero, trust, and categories sections in `Home.jsx`.
2. Fix the malformed JSX (unclosed/extra tags).
3. Ensure API usage is robust.
