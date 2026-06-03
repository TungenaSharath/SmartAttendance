import sqlite3
import os

db_path = r'c:\Users\tshar\Desktop\SmartAttendance\data\attendance.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.execute("INSERT INTO system_settings (key, value) VALUES ('campus_lat', '17.3916') ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    conn.execute("INSERT INTO system_settings (key, value) VALUES ('campus_lng', '78.3190') ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    conn.execute("INSERT INTO system_settings (key, value) VALUES ('campus_radius', '500') ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    conn.commit()
    conn.close()
    print("Coordinates successfully seeded in the database.")
else:
    print("Database path not found.")
