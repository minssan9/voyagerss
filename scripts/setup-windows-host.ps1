# Voyagerss Windows Host Setup Script
# Run this script as Administrator to configure the local development environment

param(
    [string]$Domain = "local.voyagerss.com",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Voyagerss Windows Host Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "Then run: .\scripts\setup-windows-host.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running as Administrator" -ForegroundColor Green

# Step 1: Configure hosts file
Write-Host ""
Write-Host "[Step 1/3] Configuring hosts file..." -ForegroundColor Yellow

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$entry = "127.0.0.1 $Domain"

$hostsContent = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue

if ($hostsContent -match [regex]::Escape($Domain)) {
    if ($Force) {
        Write-Host "Updating existing entry for $Domain" -ForegroundColor Yellow
        $hostsContent = $hostsContent -replace ".*$([regex]::Escape($Domain)).*", $entry
        Set-Content -Path $hostsPath -Value $hostsContent -Encoding UTF8
    } else {
        Write-Host "$Domain already exists in hosts file" -ForegroundColor Green
    }
} else {
    Add-Content -Path $hostsPath -Value "`n$entry"
    Write-Host "Added: $entry" -ForegroundColor Green
}

# Verify hosts entry
Write-Host "Verifying hosts configuration..." -ForegroundColor Gray
$verification = Get-Content $hostsPath | Select-String -Pattern $Domain
if ($verification) {
    Write-Host "Hosts file configured successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not verify hosts entry" -ForegroundColor Yellow
}

# Step 2: Check Docker Desktop
Write-Host ""
Write-Host "[Step 2/3] Checking Docker Desktop..." -ForegroundColor Yellow

try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($dockerVersion) {
        Write-Host "Docker Server Version: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not responding"
    }
} catch {
    Write-Host "WARNING: Docker is not running or not installed!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install and start Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    Write-Host "  2. Install and restart your computer" -ForegroundColor Gray
    Write-Host "  3. Start Docker Desktop" -ForegroundColor Gray
}

# Step 3: Check Docker Compose
Write-Host ""
Write-Host "[Step 3/3] Checking Docker Compose..." -ForegroundColor Yellow

try {
    $composeVersion = docker compose version --short 2>$null
    if ($composeVersion) {
        Write-Host "Docker Compose Version: $composeVersion" -ForegroundColor Green
    } else {
        throw "Docker Compose not available"
    }
} catch {
    Write-Host "WARNING: Docker Compose is not available!" -ForegroundColor Yellow
    Write-Host "Docker Compose is included with Docker Desktop" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Make sure Docker Desktop is running" -ForegroundColor White
Write-Host "  2. Clone the repository and navigate to it" -ForegroundColor White
Write-Host "  3. Run: docker compose up -d --build" -ForegroundColor White
Write-Host ""
Write-Host "Access URLs after deployment:" -ForegroundColor Green
Write-Host "  Frontend: http://$Domain:6171" -ForegroundColor Cyan
Write-Host "  Backend API: http://$Domain:6172/api" -ForegroundColor Cyan
Write-Host "  Backend Health: http://$Domain:6172/health" -ForegroundColor Cyan
Write-Host ""
