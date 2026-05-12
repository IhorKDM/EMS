from app.models.business import Business, BusinessTypeEnum
from app.models.section import Section
from app.models.user import RoleEnum, TitleEnum, User
from app.core.security import hash_password
from datetime import datetime


def _seed_admin(db) -> User:
    user = User(
        title=TitleEnum.mr,
        first_name="Admin",
        last_name="User",
        email="admin@example.com",
        dob=datetime(1985, 1, 1).date(),
        address_line1="1 Admin St",
        address_city="London",
        address_postcode="SW1A 1AA",
        address_country="UK",
        hashed_password=hash_password("Password1!"),
        role=RoleEnum.admin,
        is_first_login=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _admin_token(client, db) -> str:
    _seed_admin(db)
    resp = client.post("/auth/login", json={
        "email": "admin@example.com",
        "password": "Password1!",
    })
    return resp.json()["access_token"]


def _seed_business(db, name="Test Corp") -> Business:
    biz = Business(name=name, type=BusinessTypeEnum.office)
    db.add(biz)
    db.commit()
    db.refresh(biz)
    return biz


class TestListBusinesses:
    """GET /business"""

    def test_admin_can_list(self, client, db_session):
        token = _admin_token(client, db_session)
        _seed_business(db_session)
        resp = client.get("/business", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_no_token_returns_401(self, client):
        resp = client.get("/business")
        assert resp.status_code == 401


class TestCreateBusiness:
    """POST /business"""

    def test_admin_creates_business(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.post(
            "/business",
            json={"name": "Acme Ltd", "type": "retail"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Acme Ltd"

    def test_duplicate_name_returns_409(self, client, db_session):
        token = _admin_token(client, db_session)
        _seed_business(db_session, name="Duplicate Corp")
        resp = client.post(
            "/business",
            json={"name": "Duplicate Corp", "type": "office"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 409


class TestGetBusiness:
    """GET /business/{id}"""

    def test_admin_gets_business(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        resp = client.get(f"/business/{biz.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["id"] == biz.id

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.get("/business/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404


class TestUpdateBusiness:
    """PATCH /business/{id}"""

    def test_admin_updates_name(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        resp = client.patch(
            f"/business/{biz.id}",
            json={"name": "Renamed Corp"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Corp"


class TestDeleteBusiness:
    """DELETE /business/{id}"""

    def test_admin_deletes_business(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        resp = client.delete(f"/business/{biz.id}", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 204

    def test_not_found_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        resp = client.delete("/business/99999", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 404


class TestSections:
    """Section sub-resource under /business/{id}/sections"""

    def test_create_section(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        resp = client.post(
            f"/business/{biz.id}/sections",
            json={"name": "Engineering", "business_id": biz.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Engineering"
        assert resp.json()["business_id"] == biz.id

    def test_list_sections(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        db_session.add(Section(name="HR", business_id=biz.id))
        db_session.commit()
        resp = client.get(
            f"/business/{biz.id}/sections",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_update_section(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        section = Section(name="Old Name", business_id=biz.id)
        db_session.add(section)
        db_session.commit()
        db_session.refresh(section)
        resp = client.patch(
            f"/business/{biz.id}/sections/{section.id}",
            json={"name": "New Name"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_delete_section(self, client, db_session):
        token = _admin_token(client, db_session)
        biz = _seed_business(db_session)
        section = Section(name="To Delete", business_id=biz.id)
        db_session.add(section)
        db_session.commit()
        db_session.refresh(section)
        resp = client.delete(
            f"/business/{biz.id}/sections/{section.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 204

    def test_section_wrong_business_returns_404(self, client, db_session):
        token = _admin_token(client, db_session)
        biz1 = _seed_business(db_session, name="Biz One")
        biz2 = _seed_business(db_session, name="Biz Two")
        section = Section(name="Belongs to Biz2", business_id=biz2.id)
        db_session.add(section)
        db_session.commit()
        db_session.refresh(section)
        # Try to access biz2's section via biz1's URL
        resp = client.delete(
            f"/business/{biz1.id}/sections/{section.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404