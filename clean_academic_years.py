import sqlite3

def clean_duplicate_academic_years():
    conn = sqlite3.connect('ncert_rag/clerk/clerk.db')
    cursor = conn.cursor()
    
    # Clean up duplicate academic year strings if present
    cursor.execute("SELECT id, year_label FROM academic_years")
    rows = cursor.fetchall()
    
    seen = set()
    for row_id, label in rows:
        normalized = label.replace("–", "-").strip()
        if normalized in seen:
            cursor.execute("DELETE FROM academic_years WHERE id = ?", (row_id,))
            print(f"Deleted duplicate academic year: {row_id} ({label})")
        else:
            seen.add(normalized)
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    clean_duplicate_academic_years()
