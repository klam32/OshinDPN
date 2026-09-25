"""Create the first local administrator without any shared/default password."""
import getpass
import secrets
import sys
import time
from dotenv import load_dotenv
from .db import ROOT, connect, db_path, init_db, password_hash

def main():
    load_dotenv(ROOT / 'backend/.env')
    init_db()
    email = sys.argv[1] if len(sys.argv) > 1 else input('Admin email: ').strip().lower()
    generate = '--generate' in sys.argv
    password = secrets.token_urlsafe(18) if generate else getpass.getpass('Password (12+ characters): ')
    if '@' not in email or len(password) < 12: raise SystemExit('Email/password is invalid.')
    with connect() as c:
        if c.execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone(): raise SystemExit('Account already exists; no changes made.')
        c.execute('INSERT INTO users VALUES(?,?,?,?,?,1,?)', (secrets.token_hex(16), 'Quản trị viên', email, password_hash(password), 'admin', time.time()))
    if generate:
        path = db_path().parent / 'admin-access.txt'
        path.write_text(f'Local development admin\nEmail: {email}\nPassword: {password}\nKeep this file private; do not commit.\n', encoding='utf-8')
        print(f'Credentials saved privately to {path}.')
    else: print('Admin created.')

if __name__ == '__main__': main()
