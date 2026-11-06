import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_incident_crud():
    # CREATE
    response = client.post(
        "/api/v1/incidents",
        json={
            "title": "Test Incident",
            "description": "Testing CRUD operations",
            "severity": "High",
            "status": "Open",
        },
    )
    assert response.status_code == 201
    incident_id = response.json()["id"]

    # READ ALL
    response = client.get("/api/v1/incidents")
    assert response.status_code == 200
    assert any(item["id"] == incident_id for item in response.json())

    # READ ONE
    response = client.get(f"/api/v1/incidents/{incident_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test Incident"

    # UPDATE
    response = client.patch(
        f"/api/v1/incidents/{incident_id}",
        json={"status": "Resolved"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Resolved"

    # DELETE
    response = client.delete(f"/api/v1/incidents/{incident_id}")
    assert response.status_code == 204

    # VERIFY DELETION
    response = client.get(f"/api/v1/incidents/{incident_id}")
    assert response.status_code == 404
