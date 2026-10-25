<#
.SYNOPSIS
    KYNEXIS - Safe Development Environment Shutdown Script

.DESCRIPTION
    Stops processes started by dev-start.ps1 using the tracked PID file (.kynexis-dev.pid).
    Optionally, using -All stops all processes listening on Kynexis ports (8080-8089 and 5173).

.EXAMPLE
    .\scripts\dev-stop.ps1
    .\scripts\dev-stop.ps1 -FrontendOnly
    .\scripts\dev-stop.ps1 -BackendOnly
    .\scripts\dev-stop.ps1 -All
#>

[CmdletBinding()]
param(
    [switch]$All,
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PidFile = Join-Path $RepoRoot ".kynexis-dev.pid"
$KynexisPorts = @(5173, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   KYNEXIS - Development Environment Shutdown               " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$stoppedCount = 0

if ($All) {
    Write-Host "Scanning all KYNEXIS ports (5173, 8080-8089)..." -ForegroundColor Yellow
    foreach ($port in $KynexisPorts) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns.OwningProcess | Select-Object -Unique
            foreach ($p in $pids) {
                if ($p -gt 0) {
                    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "  Stopping $($proc.ProcessName) (PID: $p) on Port $port..." -ForegroundColor Yellow
                        & taskkill.exe /PID $p /T /F 2>$null | Out-Null
                        if (Get-Process -Id $p -ErrorAction SilentlyContinue) {
                            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                        }
                        $stoppedCount++
                    }
                }
            }
        }
    }
    if (Test-Path $PidFile) {
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
} else {
    if (-not (Test-Path $PidFile)) {
        Write-Host "No active .kynexis-dev.pid tracker file found." -ForegroundColor DarkGray
        Write-Host "To scan and stop any lingering services on ports 8080-8089/5173, run: .\scripts\dev-stop.ps1 -All" -ForegroundColor Yellow
        exit 0
    }

    $entries = Get-Content $PidFile
    $remainingEntries = @()

    foreach ($entry in $entries) {
        $parts = $entry.Split(':')
        if ($parts.Length -ge 2) {
            $p = [int]$parts[0]
            $svcName = $parts[1]

            $isFrontend = ($svcName -eq 'Frontend')
            if ($FrontendOnly -and -not $isFrontend) {
                $remainingEntries += $entry
                continue
            }
            if ($BackendOnly -and $isFrontend) {
                $remainingEntries += $entry
                continue
            }

            $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Stopping $svcName (PID: $p)..." -ForegroundColor Yellow
                & taskkill.exe /PID $p /T /F 2>$null | Out-Null
                if (Get-Process -Id $p -ErrorAction SilentlyContinue) {
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                }
                $stoppedCount++
            } else {
                Write-Host "  Process $svcName (PID: $p) already stopped." -ForegroundColor DarkGray
            }

            if ($isFrontend) {
                $feConn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
                if ($feConn) {
                    $fePids = $feConn.OwningProcess | Select-Object -Unique
                    foreach ($fp in $fePids) {
                        if ($fp -gt 0) {
                            & taskkill.exe /PID $fp /T /F 2>$null | Out-Null
                        }
                    }
                }
            }
        }
    }

    if ($remainingEntries.Count -gt 0) {
        Set-Content -Path $PidFile -Value $remainingEntries
    } else {
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }
}

# Verification
Write-Host "`nVerifying Ports Status:" -ForegroundColor Yellow
$activePorts = @()
foreach ($port in $KynexisPorts) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $activePorts += $port
    }
}

if ($activePorts.Count -eq 0) {
    Write-Host "  [OK] All KYNEXIS ports (5173, 8080-8089) are now completely closed." -ForegroundColor Green
} else {
    Write-Host "  - Still active ports: $($activePorts -join ', ')" -ForegroundColor Yellow
}

Write-Host "`nShutdown completed. Stopped $stoppedCount process(es)." -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan
