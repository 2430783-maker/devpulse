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


def test_invalid_incident_data():
    response = client.post(
        "/api/v1/incidents",
        json={
            "title": "",
            "description": "Invalid test incident",
            "severity": "Extreme",
            "status": "Open",
        },
    )

    assert response.status_code == 422


def test_update_nonexistent_incident():
    response = client.patch(
        "/api/v1/incidents/9999999999",
        json={"status": "Resolved"},
    )

    assert response.status_code == 404
