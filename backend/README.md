# EMS Backend
Rest API for Employee Management System (EMS) built with FastAPI, SQLAlchemy, and SQLite (with further support for MySQL).

## Requirements
- Python 3.14 or higher
- FastAPI
- SQLAlchemy
- SQLite
- JWT for authentication
- uv package manager
- pytest for testing

## Structure
```backend
├── app
│   ├── core/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── main.py
├── tests/
├── .gitignore
└── README.md
```



## Security
- Passwords are hashed using argon2 for secure storage.
- JWT is used for authentication, with tokens expiring after 30 minutes.
- New accounts get a **temporary password** that must be changed on first login.
- Password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character
- Secret keys and sensitive configurations are stored in environment variables.

## Security tests
- Unit tests for password hashing and verification.
- Tests for JWT token generation and validation.
- Tests for password strength validation.

## Database Schema

The ERD for the EMS backend includes the following tables:

### Table
| Name                   | Description                                                                     |
|------------------------|---------------------------------------------------------------------------------|
| `users`                | Stores user information, including username, email, hashed password, role, etc. |
| `businesses`           | Top level entity representing a business.                                       |
| `sections`             | Represents different sections within a business (e.g., HR, IT, Sales).          |
| `positions`            | Represents different positions within a section (e.g., Manager, Developer).     |
| `permissions`          | Stores permissions for different roles (e.g., Admin, Manager, Employee).        |
| `shifts`               | Represents work shifts for employees.                                           |
| `pay_configs`          | Stores pay configuration for different positions.                               |
| `business_tax_configs` | Stores tax and NI configuration for different businesses.                       |
| `payslips`             | Generated payslips for employees based on their shifts and pay configuration.   |
| `holiday_requests`     | Stores holiday requests made by employees.                                      |
| `audit_logs`           | Logs of important actions for auditing purposes.                                |

### Relationships
- A `User` belong to one Business and can have one `position`, and one `section`.
- A `Position` has set of `permissions`.
- A `Business` has many `sections`, `positions`, `employees`.
- A `User` has one `pay_config` and many `payslips`, `shifts`, and `holiday_request`.
- An `AuditLog` is associated with a `User` and records actions taken by that user.

![ERD Diagram](img/ERD.png)
