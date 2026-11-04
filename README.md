# DevPulse — Incident Management System

DevPulse is a web-based incident management dashboard that allows users to report, view, update, and delete operational incidents through a simple interface.

## Live Demo

- **Frontend:** https://devpulse-red.vercel.app
- **Backend API:** https://devpulse-backend-betn.onrender.com
- **API Documentation:** https://devpulse-backend-betn.onrender.com/docs

## Technologies Used

**Frontend**
- React
- TypeScript
- Vite
- CSS

**Backend**
- Python
- FastAPI
- Pydantic
- SQLite

**Deployment and Version Control**
- Vercel
- Render
- GitHub

## Features

- Create new incidents.
- View all reported incidents.
- Retrieve individual incidents.
- Update incident information.
- Delete incidents.
- Set incident severity: Low, Medium, High, Critical.
- Track incident status: Open, In Progress, Resolved.
- Frontend and backend integration through REST API requests.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check API health |
| POST | `/api/v1/incidents` | Create an incident |
| GET | `/api/v1/incidents` | Retrieve all incidents |
| GET | `/api/v1/incidents/{incident_id}` | Retrieve one incident |
| PATCH | `/api/v1/incidents/{incident_id}` | Update an incident |
| DELETE | `/api/v1/incidents/{incident_id}` | Delete an incident |

## Project Structure

```text
devpulse/
├── backend/
├── frontend/
├── docs/
├── vercel.json
├── README.md
└── LICENSE
```

## Running Locally

### Backend

```bash
cd backend
python -m venv .venv
```

Activate the environment on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn main:app --reload
```

Backend documentation: http://localhost:8000/docs

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite.

## Database

The backend uses SQLite to store incident records, including their title, description, severity, status, creation time, and update time.

## Project Scope

This MVP focuses on incident management, REST API implementation, CRUD operations, database integration, and frontend/backend communication.

Authentication, role-based access control, and advanced team management are outside the scope of the current MVP.

## Academic Project

**Course:** CSE309

**Project:** DevPulse — Incident Management System
