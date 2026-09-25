import os
import sys
import tempfile
from pathlib import Path
import uvicorn
from fastapi.routing import APIRoute

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
with tempfile.TemporaryDirectory(prefix='oshin-e2e-') as directory:
    os.environ.update(DATABASE_PATH=str(Path(directory) / 'e2e.db'), ADMIN_EMAIL='admin@e2e.local', ADMIN_PASSWORD='E2e-password-strong-123', LLM_NAME='vertex', PROJECT_ID='', LOCATION='', VERTEX_MODEL_NAME='', GOOGLE_APPLICATION_CREDENTIALS='', GOOGLE_APPLICATION_CREDENTIALS_JSON='', GOOGLE_APPLICATION_CREDENTIALS_BASE64='', SMTP_HOST='', SMTP_FROM='', AUTH_SECRET='e2e-auth-secret-with-at-least-32-characters', ALLOWED_ORIGINS='http://127.0.0.1:8001', COOKIE_SECURE='false')
    import backend.main as backend_main
    app = backend_main.app
    # Test-only delivery stub: browser tests never send real email.
    backend_main.new_otp_code = lambda: '100000'
    backend_main.send_otp = lambda challenge_id, purpose, email, code: None
    server = uvicorn.Server(uvicorn.Config(app, host='127.0.0.1', port=8001, log_level='warning'))

    async def stop_test_server():
        # Test-only route, never registered by backend.main in normal execution.
        server.should_exit = True
        return {'ok': True}

    app.router.routes.insert(0, APIRoute('/__test_shutdown', stop_test_server, methods=['POST']))
    server.run()
