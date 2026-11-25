from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

AUTH_URL = "/api/v1/auth"
INCIDENT_URL = "/api/v1/incidents"


def create_authenticated_user():
    """Register and log in a unique test user."""

    unique_id = uuid4().hex

    email = f"test_{unique_id}@example.com"
    password = "TestPassword123!"

    register_response = client.post(
        f"{AUTH_URL}/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Test User",
        },
    )

    assert register_response.status_code == 201

    login_response = client.post(
        f"{AUTH_URL}/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200

    access_token = login_response.json()["access_token"]

    return {
        "id": register_response.json()["user"]["id"],
        "headers": {
            "Authorization": f"Bearer {access_token}"
        },
    }


def test_health_check():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unauthenticated_incident_access():
    response = client.get(INCIDENT_URL)

    assert response.status_code == 401


def test_incident_crud():
    user = create_authenticated_user()
    headers = user["headers"]

    # CREATE
    response = client.post(
        INCIDENT_URL,
        headers=headers,
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
    response = client.get(
        INCIDENT_URL,
        headers=headers,
    )

    assert response.status_code == 200
    assert any(
        item["id"] == incident_id
        for item in response.json()
    )

    # READ ONE
    response = client.get(
        f"{INCIDENT_URL}/{incident_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Test Incident"

    # UPDATE
    response = client.patch(
        f"{INCIDENT_URL}/{incident_id}",
        headers=headers,
        json={"status": "Resolved"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Resolved"

    # DELETE
    response = client.delete(
        f"{INCIDENT_URL}/{incident_id}",
        headers=headers,
    )

    assert response.status_code == 204

    # VERIFY DELETION
    response = client.get(
        f"{INCIDENT_URL}/{incident_id}",
        headers=headers,
    )

    assert response.status_code == 404


def test_invalid_incident_data():
    user = create_authenticated_user()

    response = client.post(
        INCIDENT_URL,
        headers=user["headers"],
        json={
            "title": "",
            "description": "Invalid test incident",
            "severity": "Extreme",
            "status": "Open",
        },
    )

    assert response.status_code == 422


def test_update_nonexistent_incident():
    user = create_authenticated_user()

    response = client.patch(
        f"{INCIDENT_URL}/9999999999",
        headers=user["headers"],
        json={"status": "Resolved"},
    )

    assert response.status_code == 404


def test_incident_ownership():
    # Create two separate authenticated users.
    user_a = create_authenticated_user()
    user_b = create_authenticated_user()

    # User A creates an incident.
    create_response = client.post(
        INCIDENT_URL,
        headers=user_a["headers"],
        json={
            "title": "Private Incident",
            "description": "This belongs to User A",
            "severity": "High",
            "status": "Open",
        },
    )

    assert create_response.status_code == 201
    incident_id = create_response.json()["id"]

    # User B cannot view User A's incident.
    response = client.get(
        f"{INCIDENT_URL}/{incident_id}",
        headers=user_b["headers"],
    )

    assert response.status_code == 404

    # User B cannot update User A's incident.
    response = client.patch(
        f"{INCIDENT_URL}/{incident_id}",
        headers=user_b["headers"],
        json={"title": "Unauthorized Change"},
    )

    assert response.status_code == 404

    # User B cannot delete User A's incident.
    response = client.delete(
        f"{INCIDENT_URL}/{incident_id}",
        headers=user_b["headers"],
    )

    assert response.status_code == 404

    # User A can still access the original incident.
    response = client.get(
        f"{INCIDENT_URL}/{incident_id}",
        headers=user_a["headers"],
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Private Incident"

    # Clean up the test incident.
    response = client.delete(
        f"{INCIDENT_URL}/{incident_id}",
        headers=user_a["headers"],
    )

    assert response.status_code == 204
