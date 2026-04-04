from utils.db import get_db


class CreditService:
    def get_account(self, farmer_id: int) -> dict | None:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM credit_accounts WHERE farmer_id = %s", (farmer_id,))
            acc = cursor.fetchone()
            if acc:
                acc['remaining_credit'] = float(acc['credit_limit']) - float(acc['used_credit'])
            return acc
        finally:
            cursor.close()
            conn.close()

    def can_purchase(self, farmer_id: int, amount: float) -> dict:
        acc = self.get_account(farmer_id)
        if not acc:
            return {'approved': False, 'reason': 'No credit account found'}
        remaining = acc['remaining_credit']
        if remaining >= amount:
            return {'approved': True, 'remaining': remaining}
        return {'approved': False, 'reason': f'Credit limit exceeded. Remaining: {remaining:.2f}'}

    def charge(self, farmer_id: int, order_id: int, amount: float, description: str = '') -> dict:
        check = self.can_purchase(farmer_id, amount)
        if not check['approved']:
            return {'success': False, 'error': check['reason']}

        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE credit_accounts SET used_credit = used_credit + %s, due_amount = due_amount + %s "
                "WHERE farmer_id = %s",
                (amount, amount, farmer_id)
            )
            cursor.execute(
                "INSERT INTO credit_transactions (farmer_id, order_id, amount, transaction_type, description) "
                "VALUES (%s,%s,%s,'Charge',%s)",
                (farmer_id, order_id, amount, description)
            )
            conn.commit()
            return {'success': True}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def repay(self, farmer_id: int, amount: float) -> dict:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT used_credit, due_amount FROM credit_accounts WHERE farmer_id = %s", (farmer_id,))
            acc = cursor.fetchone()
            if not acc:
                return {'success': False, 'error': 'No credit account'}
            repay = min(amount, float(acc['due_amount']))
            cursor.execute(
                "UPDATE credit_accounts SET used_credit = GREATEST(0, used_credit - %s), "
                "due_amount = GREATEST(0, due_amount - %s) WHERE farmer_id = %s",
                (repay, repay, farmer_id)
            )
            cursor.execute(
                "INSERT INTO credit_transactions (farmer_id, amount, transaction_type, description) "
                "VALUES (%s,%s,'Repayment','Manual repayment')",
                (farmer_id, repay)
            )
            conn.commit()
            return {'success': True, 'repaid': repay}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def get_transactions(self, farmer_id: int) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT * FROM credit_transactions WHERE farmer_id = %s ORDER BY created_at DESC LIMIT 30",
                (farmer_id,)
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()
