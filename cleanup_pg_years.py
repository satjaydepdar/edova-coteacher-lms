import psycopg2

def cleanup_pg_academic_years():
    conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5433/edova')
    cur = conn.cursor()
    
    # 1. Get canonical ID for 2026-27
    cur.execute("SELECT id FROM academic_years WHERE year_label = '2026-27'")
    row = cur.fetchone()
    if not row:
        print("2026-27 canonical row not found!")
        return
    canonical_2026_id = row[0]
    
    # 2. Get non-canonical 2026 IDs
    cur.execute("SELECT id, year_label FROM academic_years WHERE year_label IN ('2026-2027', '2026–27', '2026\u201327') OR year_label LIKE '2026%27'")
    duplicate_rows = cur.fetchall()
    
    for dup_id, dup_label in duplicate_rows:
        if dup_id == canonical_2026_id:
            continue
            
        # Re-map curriculum_subjects or delete duplicate curriculums
        cur.execute("SELECT id, board, class_label FROM curriculums WHERE academic_year_id = %s", (dup_id,))
        dup_curriculums = cur.fetchall()
        for cur_id, board, class_label in dup_curriculums:
            # Check if canonical curriculum exists
            cur.execute("SELECT id FROM curriculums WHERE academic_year_id = %s AND board = %s AND class_label = %s", (canonical_2026_id, board, class_label))
            target_cur = cur.fetchone()
            if target_cur:
                target_cur_id = target_cur[0]
                # Delete curriculum_subjects hanging off dup_cur
                cur.execute("DELETE FROM curriculum_subjects WHERE curriculum_id = %s", (cur_id,))
                # Delete duplicate curriculum
                cur.execute("DELETE FROM curriculums WHERE id = %s", (cur_id,))
            else:
                cur.execute("UPDATE curriculums SET academic_year_id = %s WHERE id = %s", (canonical_2026_id, cur_id))
                
        print(f"Deleting duplicate academic_year {dup_id} ({dup_label})...")
        cur.execute("DELETE FROM academic_years WHERE id = %s", (dup_id,))
        
    conn.commit()
    
    # 3. Print remaining academic years
    cur.execute("SELECT id, year_label FROM academic_years ORDER BY year_label")
    print("Remaining Postgres academic_years:", cur.fetchall())
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    cleanup_pg_academic_years()
