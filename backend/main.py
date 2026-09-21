import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import engine, Base, SessionLocal
from backend.models.temple import Temple
from backend.models.zone import TempleZone
from backend.models.user import User
from backend.models.alert import Alert
from backend.models.pilgrim import Pilgrim
from backend.models.cctv import CCTVCamera, LiveCrowdMeasurement, SimulationRun
from backend.services.auth_service import get_password_hash

from backend.routers import auth, temples, dashboard, ml, simulation, alerts, pilgrims, cctv

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="DarshanAI - AI-Powered Multi-Temple Crowd Intelligence & Safety Management System"
)

# Enable GZIP compression for fast payload transfers (>1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(temples.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(ml.router, prefix=settings.API_V1_STR)
app.include_router(simulation.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(pilgrims.router, prefix=settings.API_V1_STR)
app.include_router(cctv.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    # Create all DB tables
    Base.metadata.create_all(bind=engine)
    seed_database()

def seed_database():
    db: Session = SessionLocal()
    try:
        # 1. Seed Temples if empty
        if db.query(Temple).count() == 0:
            print("[SEEDING] Adding verified real-world temples...")
            t1 = Temple(
                temple_id="TEMPLE-001",
                name="Sri Somnath Jyotirlinga Temple",
                address="Prabhas Patan, Veraval",
                city="Somnath",
                state="Gujarat",
                country="India",
                contact_number="+91-9876543210",
                email="contact@somnath.org",
                capacity=18000,
                opening_time="04:00 AM",
                closing_time="10:00 PM",
                status="ACTIVE",
                latitude=20.8880,
                longitude=70.4012,
                zoom_level=18
            )
            t2 = Temple(
                temple_id="TEMPLE-002",
                name="Sri Venkateswara Swamy Temple",
                address="Tirumala Hills",
                city="Tirupati",
                state="Andhra Pradesh",
                country="India",
                contact_number="+91-9876543211",
                email="contact@tirumala.org",
                capacity=25000,
                opening_time="03:00 AM",
                closing_time="11:30 PM",
                status="ACTIVE",
                latitude=13.6833,
                longitude=79.3472,
                zoom_level=18
            )
            t3 = Temple(
                temple_id="TEMPLE-003",
                name="Sri Meenakshi Sundareswarar Temple",
                address="Madurai Main",
                city="Madurai",
                state="Tamil Nadu",
                country="India",
                contact_number="+91-9876543212",
                email="contact@meenakshi.org",
                capacity=15000,
                opening_time="05:00 AM",
                closing_time="09:30 PM",
                status="ACTIVE",
                latitude=9.9195,
                longitude=78.1193,
                zoom_level=18
            )
            t5 = Temple(
                temple_id="TEMPLE-005",
                name="Sri Kashi Vishwanath Temple",
                address="Vishwanath Gali, Lahori Tola",
                city="Varanasi",
                state="Uttar Pradesh",
                country="India",
                contact_number="+91-9876543215",
                email="contact@kashivishwanath.org",
                capacity=20000,
                opening_time="03:00 AM",
                closing_time="11:00 PM",
                status="ACTIVE",
                latitude=25.3109,
                longitude=83.0107,
                zoom_level=18
            )
            db.add_all([t1, t2, t3, t5])
            db.commit()

        # 2. Seed Temple Operational Zones if empty
        if db.query(TempleZone).count() == 0:
            print("[SEEDING] Adding verified geographic operational zones...")
            zones = [
                # TEMPLE-001 (Somnath Temple, Gujarat)
                TempleZone(temple_id="TEMPLE-001", zone_code="main_entrance", name="Shree Somnath Mahadwar (Main Gate)", zone_type="ENTRY", latitude=20.8888, longitude=70.4005, capacity=2500, is_verified=True, icon_type="DoorOpen", staff_assigned=8),
                TempleZone(temple_id="TEMPLE-001", zone_code="registration", name="Yatri Suvidha & Token Counters", zone_type="REGISTRATION", latitude=20.8885, longitude=70.4008, capacity=1500, is_verified=True, icon_type="Ticket", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-001", zone_code="queue_area", name="Main Darshan Queue Complex", zone_type="QUEUE", latitude=20.8882, longitude=70.4010, capacity=4500, is_verified=True, icon_type="Users", staff_assigned=12),
                TempleZone(temple_id="TEMPLE-001", zone_code="special_queue", name="Special & Senior Citizen Queue", zone_type="QUEUE", latitude=20.8883, longitude=70.4013, capacity=1200, is_verified=True, icon_type="HeartPulse", staff_assigned=4),
                TempleZone(temple_id="TEMPLE-001", zone_code="vip_corridor", name="VIP Fast Pass Protocol Gate", zone_type="VIP", latitude=20.8879, longitude=70.4015, capacity=500, is_verified=True, icon_type="Crown", staff_assigned=4),
                TempleZone(temple_id="TEMPLE-001", zone_code="darshan_hall", name="Garbagriha (Sanctum Sanctorum)", zone_type="SANCTUM", latitude=20.8880, longitude=70.4012, capacity=2000, is_verified=True, icon_type="Flame", staff_assigned=10),
                TempleZone(temple_id="TEMPLE-001", zone_code="waiting_area", name="Devotee Holding Pavilion", zone_type="WAITING", latitude=20.8877, longitude=70.4010, capacity=2000, is_verified=True, icon_type="Armchair", staff_assigned=5),
                TempleZone(temple_id="TEMPLE-001", zone_code="medical_center", name="Emergency First Aid & Medical Post", zone_type="MEDICAL", latitude=20.8887, longitude=70.4012, capacity=200, is_verified=True, icon_type="Cross", staff_assigned=4),
                TempleZone(temple_id="TEMPLE-001", zone_code="security_post", name="Central Security & Police Command", zone_type="SECURITY", latitude=20.8889, longitude=70.4002, capacity=300, is_verified=True, icon_type="Shield", staff_assigned=8),
                TempleZone(temple_id="TEMPLE-001", zone_code="prasadam_area", name="Somnath Prasad & Bhojanalaya", zone_type="PRASADAM", latitude=20.8875, longitude=70.4015, capacity=2000, is_verified=True, icon_type="Utensils", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-001", zone_code="exit_gates", name="Coastal Sea Promenade Exit", zone_type="EXIT", latitude=20.8874, longitude=70.4008, capacity=2500, is_verified=True, icon_type="LogOut", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-001", zone_code="parking_lot", name="Outer Pilgrim Vehicle Parking", zone_type="PARKING", latitude=20.8895, longitude=70.3995, capacity=5000, is_verified=True, icon_type="Car", staff_assigned=5),

                # TEMPLE-002 (Tirupati Balaji, Andhra Pradesh)
                TempleZone(temple_id="TEMPLE-002", zone_code="main_entrance", name="Mahadwaram (Main Entrance)", zone_type="ENTRY", latitude=13.6831, longitude=79.3468, capacity=3500, is_verified=True, icon_type="DoorOpen", staff_assigned=10),
                TempleZone(temple_id="TEMPLE-002", zone_code="queue_area", name="Vaikuntam Queue Complex 1", zone_type="QUEUE", latitude=13.6838, longitude=79.3480, capacity=6000, is_verified=True, icon_type="Users", staff_assigned=15),
                TempleZone(temple_id="TEMPLE-002", zone_code="special_queue", name="Vaikuntam Queue Complex 2", zone_type="QUEUE", latitude=13.6841, longitude=79.3485, capacity=4000, is_verified=True, icon_type="HeartPulse", staff_assigned=10),
                TempleZone(temple_id="TEMPLE-002", zone_code="darshan_hall", name="Ananda Nilayam (Sanctum)", zone_type="SANCTUM", latitude=13.6833, longitude=79.3472, capacity=2500, is_verified=True, icon_type="Flame", staff_assigned=12),
                TempleZone(temple_id="TEMPLE-002", zone_code="vip_corridor", name="Supadam VIP Access Entry", zone_type="VIP", latitude=13.6830, longitude=79.3476, capacity=800, is_verified=True, icon_type="Crown", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-002", zone_code="prasadam_area", name="Laddu Prasadam Distribution", zone_type="PRASADAM", latitude=13.6826, longitude=79.3479, capacity=3000, is_verified=True, icon_type="Utensils", staff_assigned=8),
                TempleZone(temple_id="TEMPLE-002", zone_code="medical_center", name="TTD Dispensary & First Aid", zone_type="MEDICAL", latitude=13.6845, longitude=79.3465, capacity=300, is_verified=True, icon_type="Cross", staff_assigned=4),
                TempleZone(temple_id="TEMPLE-002", zone_code="exit_gates", name="Outer South Exit Corridor", zone_type="EXIT", latitude=13.6828, longitude=79.3464, capacity=3000, is_verified=True, icon_type="LogOut", staff_assigned=8),

                # TEMPLE-003 (Madurai Meenakshi Amman, Tamil Nadu)
                TempleZone(temple_id="TEMPLE-003", zone_code="main_entrance", name="East Tower (Kizhakku Gopuram)", zone_type="ENTRY", latitude=9.9195, longitude=78.1205, capacity=3000, is_verified=True, icon_type="DoorOpen", staff_assigned=8),
                TempleZone(temple_id="TEMPLE-003", zone_code="queue_area", name="Ashta Shakthi Mandapam Queue", zone_type="QUEUE", latitude=9.9193, longitude=78.1200, capacity=4000, is_verified=True, icon_type="Users", staff_assigned=10),
                TempleZone(temple_id="TEMPLE-003", zone_code="darshan_hall", name="Meenakshi Amman Sanctum", zone_type="SANCTUM", latitude=9.9195, longitude=78.1193, capacity=1800, is_verified=True, icon_type="Flame", staff_assigned=8),
                TempleZone(temple_id="TEMPLE-003", zone_code="special_queue", name="Sundareswarar Sannidhi Queue", zone_type="QUEUE", latitude=9.9198, longitude=78.1190, capacity=2000, is_verified=True, icon_type="HeartPulse", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-003", zone_code="waiting_area", name="Thousand Pillar Hall", zone_type="WAITING", latitude=9.9190, longitude=78.1200, capacity=2500, is_verified=True, icon_type="Armchair", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-003", zone_code="exit_gates", name="West Tower Exit Gate", zone_type="EXIT", latitude=9.9195, longitude=78.1181, capacity=2500, is_verified=True, icon_type="LogOut", staff_assigned=6),

                # TEMPLE-005 (Kashi Vishwanath, Varanasi, UP)
                TempleZone(temple_id="TEMPLE-005", zone_code="main_entrance", name="Kashi Vishwanath Corridor Gateway", zone_type="ENTRY", latitude=25.3102, longitude=83.0125, capacity=3500, is_verified=True, icon_type="DoorOpen", staff_assigned=10),
                TempleZone(temple_id="TEMPLE-005", zone_code="queue_area", name="Mandir Chowk Holding Complex", zone_type="QUEUE", latitude=25.3105, longitude=83.0118, capacity=4500, is_verified=True, icon_type="Users", staff_assigned=12),
                TempleZone(temple_id="TEMPLE-005", zone_code="darshan_hall", name="Jyotirlinga Garbagriha (Sanctum)", zone_type="SANCTUM", latitude=25.3109, longitude=83.0107, capacity=1500, is_verified=True, icon_type="Flame", staff_assigned=10),
                TempleZone(temple_id="TEMPLE-005", zone_code="vip_corridor", name="Sugam Darshan VIP Gate", zone_type="VIP", latitude=25.3115, longitude=83.0102, capacity=800, is_verified=True, icon_type="Crown", staff_assigned=4),
                TempleZone(temple_id="TEMPLE-005", zone_code="prasadam_area", name="Annakshetra & Bhog Hall", zone_type="PRASADAM", latitude=25.3108, longitude=83.0122, capacity=2000, is_verified=True, icon_type="Utensils", staff_assigned=6),
                TempleZone(temple_id="TEMPLE-005", zone_code="exit_gates", name="Lalita Ghat Riverfront Exit", zone_type="EXIT", latitude=25.3095, longitude=83.0135, capacity=3000, is_verified=True, icon_type="LogOut", staff_assigned=6),
            ]
            db.add_all(zones)
            db.commit()

        # 3. Seed Users if empty
        if db.query(User).count() == 0:
            print("[SEEDING] Adding initial users across roles...")
            users = [
                User(
                    temple_id=None,
                    email="superadmin@darshanai.com",
                    hashed_password=get_password_hash("SuperAdmin123!"),
                    full_name="Global Platform Super Admin",
                    role="SUPER_ADMIN",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-001",
                    email="admin@temple001.com",
                    hashed_password=get_password_hash("TempleAdmin123!"),
                    full_name="Somnath Temple Administrator",
                    role="TEMPLE_ADMIN",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-001",
                    email="manager@temple001.com",
                    hashed_password=get_password_hash("Manager123!"),
                    full_name="Rajesh Kumar (Operations Manager)",
                    role="MANAGER",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-001",
                    email="security@temple001.com",
                    hashed_password=get_password_hash("Security123!"),
                    full_name="Vikram Singh (Chief Security Officer)",
                    role="SECURITY",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-001",
                    email="medical@temple001.com",
                    hashed_password=get_password_hash("Medical123!"),
                    full_name="Dr. Ananya Sharma (First Aid Lead)",
                    role="MEDICAL",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-001",
                    email="reception@temple001.com",
                    hashed_password=get_password_hash("Reception123!"),
                    full_name="Suresh Patel (Token Receptionist)",
                    role="RECEPTIONIST",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-001",
                    email="volunteer@temple001.com",
                    hashed_password=get_password_hash("Volunteer123!"),
                    full_name="Amit Verma (Queue Volunteer Lead)",
                    role="VOLUNTEER",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-002",
                    email="admin@temple002.com",
                    hashed_password=get_password_hash("TempleAdmin123!"),
                    full_name="Tirupati Temple Administrator",
                    role="TEMPLE_ADMIN",
                    is_active=True
                ),
                User(
                    temple_id="TEMPLE-003",
                    email="admin@temple003.com",
                    hashed_password=get_password_hash("TempleAdmin123!"),
                    full_name="Madurai Temple Administrator",
                    role="TEMPLE_ADMIN",
                    is_active=True
                )
            ]
            db.add_all(users)
            db.commit()

        # 4. Seed initial alerts if empty
        if db.query(Alert).count() == 0:
            print("[SEEDING] Adding sample safety alerts...")
            alerts = [
                Alert(
                    temple_id="TEMPLE-001",
                    severity="HIGH",
                    zone="Queue Complex",
                    description="Sudden 25% surge in queue density at Gate 2. Open backup counter 4.",
                    alert_type="CROWD_SURGE",
                    status="ACTIVE"
                ),
                Alert(
                    temple_id="TEMPLE-001",
                    severity="MEDIUM",
                    zone="Darshan Hall",
                    description="Average waiting time exceeded 40 minutes threshold.",
                    alert_type="RISK_SURGE",
                    status="ACTIVE"
                )
            ]
            db.add_all(alerts)
            db.commit()

        # 5. Seed initial multi-category devotees if empty
        if db.query(Pilgrim).count() == 0:
            print("[SEEDING] Adding multi-category sample devotees...")
            pilgrims = [
                Pilgrim(
                    temple_id="TEMPLE-001",
                    name="Amitabh Sen",
                    age=42,
                    phone="+91-9811122233",
                    group_size=5,
                    category="General Darshan",
                    darshan_type="General Darshan",
                    token="TKN-GEN-0104",
                    queue_position=1,
                    zone="Queue Complex",
                    counter="Counter 1",
                    estimated_wait_min=35.0,
                    status="WAITING"
                ),
                Pilgrim(
                    temple_id="TEMPLE-001",
                    name="Ramesh Sharma",
                    age=45,
                    phone="+91-9844455566",
                    group_size=4,
                    category="Special Darshan",
                    darshan_type="Special Darshan",
                    token="TKN-SPC-0102",
                    queue_position=2,
                    zone="Sanctum Corridor",
                    counter="Counter 3",
                    estimated_wait_min=15.0,
                    status="IN_DARSHAN"
                ),
                Pilgrim(
                    temple_id="TEMPLE-001",
                    name="Industrialist K. Singhania",
                    age=58,
                    phone="+91-9877788899",
                    group_size=2,
                    category="VIP",
                    darshan_type="VIP",
                    token="TKN-VIP-0012",
                    queue_position=3,
                    zone="VIP Corridor",
                    counter="VIP Counter",
                    estimated_wait_min=5.0,
                    status="CALLED"
                ),
                Pilgrim(
                    temple_id="TEMPLE-001",
                    name="Kalyani Devi (Senior)",
                    age=74,
                    phone="+91-9822233344",
                    group_size=2,
                    category="Senior Citizen",
                    darshan_type="Senior Citizen",
                    token="TKN-SNR-0018",
                    queue_position=4,
                    zone="Special Care Lane",
                    counter="Counter 3",
                    estimated_wait_min=12.0,
                    status="WAITING"
                ),
                Pilgrim(
                    temple_id="TEMPLE-001",
                    name="Manoj Varma (Divyang)",
                    age=32,
                    phone="+91-9833344455",
                    group_size=1,
                    category="Divyang",
                    darshan_type="Divyang",
                    token="TKN-DIV-0005",
                    queue_position=5,
                    zone="Ramp Access",
                    counter="Counter 4",
                    estimated_wait_min=8.0,
                    status="SERVING"
                )
            ]
            db.add_all(pilgrims)
            db.commit()

        print("[SEEDING] Database initialization complete.")
    except Exception as e:
        print(f"[SEEDING ERROR] {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/")
def read_root():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "ONLINE",
        "description": "DarshanAI Multi-Temple Crowd Intelligence & Safety Platform"
    }
