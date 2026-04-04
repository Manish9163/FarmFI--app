from utils.db import get_db


class PesticideService:
    def get_solution(self, disease_name: str) -> dict | None:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM pesticide_solutions WHERE disease_name = %s",
                (disease_name,)
            )
            return cursor.fetchone()
        finally:
            cursor.close()
            conn.close()

    def list_all(self) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM pesticide_solutions ORDER BY disease_name")
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()
