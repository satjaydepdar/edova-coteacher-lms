import sqlite3
c = sqlite3.connect('ncert_rag/clerk/clerk.db')
print("Tables:", c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())
try:
    print("Academic years:", c.execute("SELECT * FROM academic_years").fetchall())
except:
    pass
try:
    cols = c.execute("PRAGMA table_info(academic_years)").fetchall()
    print("Columns:", cols)
except:
    pass
c.close()
