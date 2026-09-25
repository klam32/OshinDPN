$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Unable to create Python environment.' }
}
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
if (-not (Test-Path -LiteralPath 'node_modules\vite')) {
    npm ci --cache .npm-cache
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
}
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
Write-Host 'Website: http://127.0.0.1:8000'
Write-Host 'Admin setup and configuration: README.md'
& .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
