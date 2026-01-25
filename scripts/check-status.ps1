# Voyagerss Deployment Status Check Script
# Run this script to verify the health of all services

param(
    [string]$Domain = "local.voyagerss.com",
    [int]$FrontendPort = 6171,
    [int]$BackendPort = 6172,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

function Write-Status {
    param(
        [string]$Service,
        [string]$Status,
        [string]$Details = ""
    )

    $statusColor = switch ($Status) {
        "OK" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        default { "White" }
    }

    $statusIcon = switch ($Status) {
        "OK" { "[OK]" }
        "WARNING" { "[!]" }
        "ERROR" { "[X]" }
        default { "[ ]" }
    }

    Write-Host "$statusIcon " -NoNewline -ForegroundColor $statusColor
    Write-Host "$Service" -NoNewline -ForegroundColor White
    if ($Details) {
        Write-Host " - $Details" -ForegroundColor Gray
    } else {
        Write-Host ""
    }
}

function Test-Endpoint {
    param(
        [string]$Url,
        [int]$TimeoutSec = 10
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            Content = $response.Content
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Voyagerss Deployment Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking services at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Check Docker containers
Write-Host "Docker Containers:" -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$backendContainer = docker ps --filter "name=voyagerss-backend" --format "{{.Status}}" 2>$null
$frontendContainer = docker ps --filter "name=voyagerss-frontend" --format "{{.Status}}" 2>$null

if ($backendContainer) {
    Write-Status -Service "Backend Container" -Status "OK" -Details $backendContainer
} else {
    Write-Status -Service "Backend Container" -Status "ERROR" -Details "Not running"
}

if ($frontendContainer) {
    Write-Status -Service "Frontend Container" -Status "OK" -Details $frontendContainer
} else {
    Write-Status -Service "Frontend Container" -Status "ERROR" -Details "Not running"
}

Write-Host ""

# Check endpoints via localhost
Write-Host "Localhost Endpoints:" -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

# Backend Health (localhost)
$backendHealthUrl = "http://localhost:$BackendPort/health"
$backendResult = Test-Endpoint -Url $backendHealthUrl

if ($backendResult.Success) {
    $healthData = $backendResult.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($healthData.status -eq "ok") {
        Write-Status -Service "Backend Health" -Status "OK" -Details "Status: OK, Timestamp: $($healthData.timestamp)"
    } else {
        Write-Status -Service "Backend Health" -Status "WARNING" -Details "Unexpected response"
    }
} else {
    Write-Status -Service "Backend Health" -Status "ERROR" -Details $backendResult.Error
}

# Frontend (localhost)
$frontendUrl = "http://localhost:$FrontendPort"
$frontendResult = Test-Endpoint -Url $frontendUrl

if ($frontendResult.Success) {
    Write-Status -Service "Frontend" -Status "OK" -Details "Status: $($frontendResult.StatusCode)"
} else {
    Write-Status -Service "Frontend" -Status "ERROR" -Details $frontendResult.Error
}

Write-Host ""

# Check endpoints via domain
Write-Host "Domain Endpoints ($Domain):" -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

# Check if domain resolves
try {
    $resolved = [System.Net.Dns]::GetHostAddresses($Domain)
    Write-Status -Service "DNS Resolution" -Status "OK" -Details "Resolves to $($resolved[0].IPAddressToString)"
} catch {
    Write-Status -Service "DNS Resolution" -Status "ERROR" -Details "Cannot resolve $Domain"
    Write-Host ""
    Write-Host "To fix DNS resolution, add this to C:\Windows\System32\drivers\etc\hosts:" -ForegroundColor Yellow
    Write-Host "  127.0.0.1 $Domain" -ForegroundColor Cyan
}

# Backend Health (domain)
$backendHealthDomainUrl = "http://${Domain}:$BackendPort/health"
$backendDomainResult = Test-Endpoint -Url $backendHealthDomainUrl

if ($backendDomainResult.Success) {
    Write-Status -Service "Backend via Domain" -Status "OK" -Details $backendHealthDomainUrl
} else {
    Write-Status -Service "Backend via Domain" -Status "WARNING" -Details "Check hosts file"
}

# Frontend (domain)
$frontendDomainUrl = "http://${Domain}:$FrontendPort"
$frontendDomainResult = Test-Endpoint -Url $frontendDomainUrl

if ($frontendDomainResult.Success) {
    Write-Status -Service "Frontend via Domain" -Status "OK" -Details $frontendDomainUrl
} else {
    Write-Status -Service "Frontend via Domain" -Status "WARNING" -Details "Check hosts file"
}

Write-Host ""

# API health check via frontend proxy
Write-Host "API Proxy Test:" -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$apiProxyUrl = "http://localhost:$FrontendPort/api-health"
$apiProxyResult = Test-Endpoint -Url $apiProxyUrl

if ($apiProxyResult.Success) {
    Write-Status -Service "Backend via Frontend Proxy" -Status "OK" -Details "Nginx proxy working"
} else {
    Write-Status -Service "Backend via Frontend Proxy" -Status "WARNING" -Details "Proxy may not be configured"
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Access URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend:      http://$Domain`:$FrontendPort" -ForegroundColor White
Write-Host "Backend API:   http://$Domain`:$BackendPort/api" -ForegroundColor White
Write-Host "Health Check:  http://$Domain`:$BackendPort/health" -ForegroundColor White
Write-Host ""

# Verbose output
if ($Verbose) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Docker Details" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    docker compose ps
    Write-Host ""
    Write-Host "Recent Backend Logs:" -ForegroundColor Yellow
    docker compose logs backend --tail=10 2>$null
    Write-Host ""
    Write-Host "Recent Frontend Logs:" -ForegroundColor Yellow
    docker compose logs frontend --tail=10 2>$null
}
