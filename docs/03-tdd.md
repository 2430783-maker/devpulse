# Technical Design Document (TDD)
 
## DevPulse – Incident Management System

**Course:** CSE309  
**Project:** DevPulse  
**Document Type:** Technical Design Document  
**Version:** 1.0  
**Status:** MVP Design

---

## 1. Introduction

### 1.1 Purpose

This Technical Design Document describes the architecture, technologies, database design, API structure, frontend design, and deployment approach for DevPulse.

DevPulse is an incident management system designed to allow users to create, view, update, and delete incidents through a web-based interface.

The Minimum Viable Product (MVP) focuses on implementing complete CRUD (Create, Read, Update, Delete) functionality, connecting the frontend with a backend REST API, and storing incident information in a database.

### 1.2 Project Scope

The MVP includes:

- Creating new incidents.
- Viewing a list of incidents.
- Viewing individual incident details.
- Updating existing incidents.
- Deleting incidents.
- Validating user input.
- Persisting incident information in a database.
- Integrating the React frontend with the FastAPI backend.
- Deploying the application using Vercel.

Advanced functionality such as authentication, role-based access control, team management, and incident assignment is planned for a future Beta version.

---

## 2. System Architecture

### 2.1 Architecture Overview

DevPulse follows a client-server architecture consisting of three main components:

1. **Frontend:** A React and TypeScript application that provides the user interface.
2. **Backend:** A FastAPI application that exposes RESTful APIs and handles application logic.
3. **Database:** A relational database used to store incident records.

The frontend communicates with the backend through HTTP requests. The backend validates requests, performs the required operations, and communicates with the database.

### 2.2 Architecture Diagram

```text
              User
                |
                v
       React + TypeScript
            Frontend
                |
          HTTP Requests
                |
                v
         FastAPI Backend
                |
        Application Logic
                |
                v
         Database Layer
                |
                v
       Supabase PostgreSQL
```

### 2.3 Request Flow

1. The user performs an action through the frontend.
2. The frontend sends an HTTP request to the appropriate API endpoint.
3. FastAPI receives and validates the request.
4. The backend performs the requested operation through the database layer.
5. The database returns the result.
6. The backend sends an appropriate HTTP response.
7. The frontend updates the interface based on the response.

---

## 3. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | Building the user interface |
| Programming Language | TypeScript | Type-safe frontend development |
| Frontend Build Tool | Vite | Development server and production builds |
| Styling | CSS | User interface styling |
| Backend Framework | FastAPI | Building REST APIs |
| Backend Language | Python | Backend application logic |
| Data Validation | Pydantic | Validating request and response data |
| Database | PostgreSQL (Supabase) | Persistent incident storage |
| API Documentation | OpenAPI / Swagger UI | API documentation and testing |
| Deployment | Vercel | Hosting the frontend and backend |
| Version Control | Git and GitHub | Source code management and collaboration |

---

## 4. Database Design

### 4.1 Database Overview

DevPulse uses a relational database to store incident information.

For the MVP, the primary database entity is **Incident**. Each incident represents an issue or event that requires tracking and management.

Supabase PostgreSQL is planned as the production database. SQLite may be used for local development and testing where appropriate.

### 4.2 Incident Entity

The Incident entity contains the following attributes:

| Attribute | Data Type | Description |
|---|---|---|
| id | UUID | Unique identifier for each incident |
| title | String | Short title describing the incident |
| description | Text | Detailed incident information |
| severity | String | Incident severity level |
| status | String | Current incident status |
| created_at | Timestamp | Date and time of creation |
| updated_at | Timestamp | Date and time of the latest update |

### 4.3 Incident Fields

The incident severity field may contain values such as:

- Low
- Medium
- High
- Critical

The incident status field may contain values such as:

- Open
- In Progress
- Resolved
- Closed

These fields will be validated by the backend to prevent invalid values from being stored.

### 4.4 Future Database Extensions

The Beta version may introduce additional entities:

- **Users:** Stores registered user information.
- **RefreshTokens:** Manages authentication sessions.
- **Teams:** Stores team information.
- **TeamMembers:** Connects users with teams.

These entities are outside the scope of the initial MVP.

---

## 5. Backend Design

### 5.1 Backend Overview

The backend is developed using Python and FastAPI.

FastAPI provides RESTful endpoints for handling incident operations. It also supports automatic API documentation through OpenAPI and Swagger UI.

The backend is responsible for:

- Processing incoming HTTP requests.
- Validating request data.
- Executing CRUD operations.
- Communicating with the database.
- Returning appropriate HTTP status codes and JSON responses.
- Handling errors.

### 5.2 REST API Design

All API endpoints use the `/api` prefix.

#### 5.2.1 Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks whether the backend is running |

Expected response:

```json
{
  "status": "ok"
}
```

#### 5.2.2 Incident CRUD Endpoints

| Operation | HTTP Method | Endpoint | Description |
|---|---|---|---|
| Create | POST | `/api/v1/incidents` | Creates a new incident |
| Read List | GET | `/api/v1/incidents` | Retrieves all incidents |
| Read Single | GET | `/api/v1/incidents/{id}` | Retrieves a specific incident |
| Update | PATCH | `/api/v1/incidents/{id}` | Updates an existing incident |
| Delete | DELETE | `/api/v1/incidents/{id}` | Deletes an incident |

#### 5.2.3 Example Create Request

```http
POST /api/v1/incidents
Content-Type: application/json
```

Request body:

```json
{
  "title": "Server unavailable",
  "description": "The application server is not responding.",
  "severity": "High",
  "status": "Open"
}
```

The backend validates the submitted information and stores the incident in the database.

#### 5.2.4 Example Update Request

```http
PATCH /api/v1/incidents/{id}
Content-Type: application/json
```

Example request body:

```json
{
  "status": "In Progress"
}
```

Only the supplied fields are updated.

### 5.3 HTTP Status Codes

| Status Code | Meaning | Usage |
|---|---|---|
| 200 | OK | Successful read or update |
| 201 | Created | Incident successfully created |
| 204 | No Content | Incident successfully deleted |
| 404 | Not Found | Requested incident does not exist |
| 422 | Unprocessable Entity | Invalid request data |
| 500 | Internal Server Error | Unexpected server-side error |

### 5.4 API Documentation

FastAPI provides interactive API documentation through Swagger UI.

The intended documentation endpoint is:

`/api/docs`

This allows developers and assessors to inspect and test API endpoints directly.

---

## 6. Frontend Design

### 6.1 Frontend Overview

The frontend is developed using React, TypeScript, and Vite.

It provides the interface through which users interact with the incident management system.

The frontend communicates with the backend using the Fetch API.

### 6.2 Main Functional Components

The MVP frontend will include:

**Incident List**
- Displays all existing incidents.
- Shows important incident information.
- Provides access to individual incident details.

**Create Incident Form**
- Accepts incident title and description.
- Allows users to select severity and status.
- Submits incident information to the backend.

**Incident Details**
- Displays information about a selected incident.
- Allows users to review incident details.

**Edit Incident**
- Allows users to modify existing incident information.
- Sends update requests to the backend.

**Delete Incident**
- Allows users to delete an existing incident.
- Updates the displayed incident list after successful deletion.

### 6.3 Frontend-Backend Communication

The frontend sends HTTP requests to the backend using the Fetch API.

During local development, Vite is configured to proxy requests beginning with `/api` to the local FastAPI server at:

`http://localhost:8000`

This allows the frontend to communicate with the backend without manually configuring separate API URLs during development.

---

## 7. Deployment Architecture

### 7.1 Deployment Platform

Vercel is used as the deployment platform for the DevPulse application.

The repository contains a `vercel.json` configuration file that defines separate services for the frontend and backend.

### 7.2 Vercel Configuration

The deployment configuration defines:

- A backend service using FastAPI, with `backend` as its root directory and `main:app` as its entry point.
- A frontend service using Vite, with `frontend` as its root directory.
- API routing rules that direct requests beginning with `/api/` to the backend service.
- Other application requests to the frontend service.

### 7.3 Deployment Workflow

The intended deployment workflow is:

1. Code changes are pushed to GitHub.
2. The repository is connected to Vercel.
3. Vercel builds the frontend and backend services using the project configuration.
4. The application is deployed.
5. The deployed application is tested through its public URL.

The deployment configuration is defined in `vercel.json`.

---

## 8. Security and Validation

### 8.1 MVP Security

The MVP focuses on basic application-level validation and error handling.

The backend will:

- Validate incoming request data using Pydantic.
- Reject invalid field values.
- Return appropriate HTTP status codes.
- Handle missing incident records.
- Avoid exposing unnecessary internal error information.

Authentication and role-based access control are not included in the initial MVP.

### 8.2 Future Security Enhancements

The Beta version may introduce:

- User authentication.
- Password hashing.
- Secure session management.
- Role-based access control.
- Team-based permissions.
- Protected API endpoints.

---

## 9. Testing Strategy

Testing will be performed to verify that the application works as expected.

### 9.1 Backend Testing

The backend API will be tested using Swagger UI and, where appropriate, Postman.

Testing will cover:

- Creating an incident.
- Retrieving the incident list.
- Retrieving an individual incident.
- Updating an incident.
- Deleting an incident.
- Submitting invalid data.
- Requesting a non-existent incident.
- Checking backend health.

### 9.2 Frontend Testing

The frontend will be tested through the browser.

Testing will cover:

- Displaying the incident list.
- Creating new incidents through the interface.
- Viewing incident details.
- Updating incident information.
- Deleting incidents.
- Displaying appropriate error messages.

### 9.3 Integration Testing

Integration testing will verify that the frontend communicates correctly with the backend and that changes are persisted in the database.

Browser Developer Tools will be used to inspect network requests, responses, HTTP methods, and status codes.

---

## 10. Version Control and Development Workflow

Git and GitHub are used for version control and project management.

The development workflow follows these practices:

- Issues are created to track development tasks.
- Feature branches are used for individual features.
- Pull Requests are created to propose changes.
- Changes are reviewed and merged into the main branch.
- The main branch represents the integrated project version.

This workflow supports organized development and makes changes easier to track.

---

## 11. Future Enhancements

The following features are planned for future versions of DevPulse:

- User registration and login.
- Role-based access control.
- Incident assignment.
- Team management.
- Advanced incident filtering and searching.
- Improved dashboard and reporting.
- Notifications and activity tracking.

These features are not required for the initial MVP.

---

## 12. Conclusion

DevPulse is designed as a web-based incident management system using React, TypeScript, FastAPI, and PostgreSQL.

The MVP focuses on delivering complete incident CRUD functionality through RESTful APIs, persistent database storage, frontend-backend integration, and deployment through Vercel.

The proposed architecture provides a foundation for future enhancements, including authentication, team management, and role-based access control.
