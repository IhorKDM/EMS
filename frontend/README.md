# EMS Frontend

React frontend for the Employee Management System (EMS) REST API.

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 18 |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| Global state | Zustand |
| Forms | React Hook Form |
| HTTP client | Axios |
| UI / Styling | Tailwind CSS |
| Notifications | react-hot-toast |
| Build | Vite |

## Getting Started

```bash
# Go to frontend folder
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default.
The backend API must be running on `http://localhost:8000`.


## Project Structure

```
src/
├── api/              
├── store/
│   ├── authStore.js  # Zustand — user, tokens, setAuth, logout
│   └── uiStore.js    # Zustand — sidebar open state
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx   # Route guard
│   ├── layout/
│   │   ├── AppShell.jsx
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   └── shared/
│       ├── ConfirmDialog.jsx
│       ├── EmptyState.jsx
│       ├── PageHeader.jsx
│       ├── PermissionToggles.jsx
│       └── StatusBadge.jsx
├── lib/
│   ├── permissions.js
│   └── utils.js
└── pages/
    ├── auth/
    ├── dashboard/
    ├── profile/
    ├── admin/
    ├── business/
    ├── positions/
    ├── schedule/
    ├── payroll/
    ├── holidays/
    └── logs/
```

## Roles & Permissions

The system has three roles: **admin**, **manager**, and **employee**.

- **Admin** — full access to everything, bypasses all permission checks.
- **Manager** — access determined by 10 boolean flags attached to their position:

| Permission | What it unlocks |
|---|---|
| `can_add_user` | Create users, promote users |
| `can_delete_user` | Delete users |
| `can_manage_positions` | Create / edit / delete positions |
| `can_manage_sections` | Add / rename / delete sections within a business |
| `can_accept_requests` | Approve or reject holiday requests |
| `can_manage_schedule` | Create / edit / delete shifts |
| `can_view_payroll` | View pay configs and tax config |
| `can_manage_payroll` | Create / edit pay configs, generate payslips |
| `can_see_logs` | View audit log |
| `can_promote_user` | *(reserved)* |

- **Employee** — can view their own schedule, payslips, and submit holiday requests.

Permission checks in the UI use the `canDo(user, 'permission_key')` helper in `src/lib/permissions.js`. The server always re-validates — client checks are UI-only (show/hide buttons and nav items).

## Route Map

| Path | Access |
|---|---|
| `/login` | Public |
| `/change-password` | Authenticated, `is_first_login = true` |
| `/dashboard` | All roles |
| `/profile` | All roles |
| `/admin/users` | Admin + managers with `can_add_user` or `can_delete_user` |
| `/admin/users/new` | Admin + `can_add_user` |
| `/admin/users/:id` | Admin + managers with user permissions |
| `/admin/users/:id/promote` | Admin + `can_add_user` |
| `/business` | Admin + `can_manage_sections` |
| `/business/:id` | Admin + `can_manage_sections` |
| `/business/new` | Admin only |
| `/business/:id/edit` | Admin only |
| `/positions` | Admin + `can_manage_positions` |
| `/positions/new` | Admin + `can_manage_positions` |
| `/positions/:id/edit` | Admin + `can_manage_positions` |
| `/schedule` | All roles (employees see own shifts only) |
| `/schedule/shifts/new` | Admin + `can_manage_schedule` |
| `/schedule/shifts/:id/edit` | Admin + `can_manage_schedule` |
| `/payroll/tax-config` | Admin only |
| `/payroll/generate` | Admin + `can_manage_payroll` |
| `/payroll/payslips` | All roles (employees see own only) |
| `/payroll/payslips/:id` | All roles (employees see own only) |
| `/holidays/submit` | All roles |
| `/holidays/mine` | All roles |
| `/holidays/review` | Admin + `can_accept_requests` |
| `/logs` | Admin + `can_see_logs` |