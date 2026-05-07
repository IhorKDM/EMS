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
