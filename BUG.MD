\# Bug Report – Python Version Mismatch in Setup Documentation



\## Bug Title



Python version mismatch between project configuration and README documentation



\## Description



The DARSHANAI README currently states that the backend requires \*\*Python 3.12\*\*:



> Backend: Python 3.12, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2, PyJWT, Bcrypt, WebSockets, SQLite



However, the project's current Python configuration uses \*\*Python 3.11.9\*\*.



This mismatch may cause contributors to install an unsupported Python version and encounter dependency or environment-related issues while setting up the project.



\## Current Behavior



The README instructs contributors to use Python 3.12, while the project configuration expects Python 3.11.9.



\## Expected Behavior



The README should specify the same Python version used by the project's current configuration.



\## Impact



\* New contributors may install the wrong Python version.

\* Dependency installation may behave differently across environments.

\* Local development and deployment environments may become inconsistent.

\* Debugging setup-related issues becomes harder.



\## Proposed Fix



Update the README Technology Stack and setup instructions to clearly specify the project's supported Python version.



For example:



```text

Backend: Python 3.11.9, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2, PyJWT, Bcrypt, WebSockets, SQLite

```



The repository's Python configuration should remain the source of truth.



\## Verification



After making the documentation change:



1\. Confirm the Python version specified in README matches the project configuration.

2\. Create a clean virtual environment using the documented Python version.

3\. Install the backend dependencies.

4\. Start the FastAPI backend.

5\. Confirm that the server starts successfully.



\## Type



\* \[x] Documentation

\* \[x] Developer Experience

\* \[ ] Frontend Bug

\* \[ ] Backend Bug

\* \[ ] Machine Learning Bug

\* \[ ] Security Bug



\## Priority



Low / Medium



\## Suggested Commit Message



```text

docs: fix Python version in setup documentation

```



