import sqlite3
import hashlib
from backend.services.auth_service import get_password_hash

conn = sqlite3.connect('backend/darshanai.db')
c = conn.cursor()

password_map = {
    'superadmin@darshanai.com': 'SuperAdmin123!',
    'admin@temple001.com': 'TempleAdmin123!',
    'manager@temple001.com': 'Manager123!',
    'security@temple001.com': 'Security123!',
    'medical@temple001.com': 'Medical123!',
    'reception@temple001.com': 'Reception123!',
    'volunteer@temple001.com': 'Volunteer123!',
    'admin@temple002.com': 'TempleAdmin123!',
    'admin@temple003.com': 'TempleAdmin123!',
}

for email, pwd in password_map.items():
    new_hash = get_password_hash(pwd)
    c.execute('UPDATE users SET hashed_password = ? WHERE email = ?', (new_hash, email))

# For any other user, update to sha256 hash
other_users = c.execute("SELECT email, hashed_password FROM users WHERE email LIKE '%@testtemple.org'").fetchall()
for u in other_users:
    c.execute("UPDATE users SET hashed_password = ? WHERE email = ?", (get_password_hash('TempleAdmin123!'), u[0]))

conn.commit()

rows = c.execute("SELECT email, hashed_password FROM users").fetchall()
for r in rows:
    print(r[0], "->", r[1][:25])

conn.close()
print("All users updated successfully to fast hashes.")
