# Product features

Put product-specific frontend code here, one folder per feature:

```
src/features/
  projects/
    ProjectsPage.jsx
    components/
    hooks/
    projectsService.js   # uses `api` from src/services/api.js
```

Wire it up in three places, none of which touch auth:

1. `src/App.jsx` — add a route inside the `/app` layout:
   `<Route path="projects" element={<ProjectsPage />} />`
2. `src/components/Sidebar.jsx` — add an entry to `navigation`.
3. (Optional) replace `src/pages/DashboardPage.jsx` with your real home screen.

Use `useAuth()` for the current user and `useToast()` for notifications.
