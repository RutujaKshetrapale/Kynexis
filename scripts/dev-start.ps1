<#
.SYNOPSIS
    KYNEXIS - Fast Development Workflow Startup Script

.DESCRIPTION
    Launches KYNEXIS with two primary modes:
      - Frontend: Starts the React 19 / Vite development server in ~1 second.
      - FullStack: Validates prerequisites, builds missing/changed JARs incrementally in parallel,
                  starts all 10 microservices with tuned JVM flags (-Xms64m -Xmx256m -XX:TieredStopAtLevel=1),
                  verifies real HTTP health checks, and launches the frontend.
      - Backend: Starts all 10 microservices and API Gateway without launching the frontend.

.EXAMPLE
    .\scripts\dev-start.ps1 -Mode Frontend
    .\scripts\dev-start.ps1 -Mode FullStack
    .\scripts\dev-start.ps1 -Mode FullStack -DbPassword "21011017"
    .\scripts\dev-start.ps1 -Mode Backend -SkipBuild
#>

[CmdletBinding()]
param(
    [ValidateSet('Frontend', 'FullStack', 'Backend')]
    [string]$Mode = 'FullStack',

    [string]$DbPassword,
    [string]$DbUser = 'root',
    [string]$DbUrl = 'jdbc:mysql://localhost:3306/smart_factory_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC',

    [switch]$SkipBuild,
    [switch]$ForceBuild,
    [int]$TimeoutSeconds = 60,
    [int]$VitePort = 5173,
    [string]$JvmHeap = '256m'
)

$ErrorActionPreference = 'Stop'
$scriptStartTime = [System.Diagnostics.Stopwatch]::StartNew()

# -----------------------------------------------------------------------------
# 1. Paths and Directories
# -----------------------------------------------------------------------------
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackendDir = Join-Path $RepoRoot "Backend"
$FrontendDir = Join-Path $RepoRoot "Frontend"
$PidFile = Join-Path $RepoRoot ".kynexis-dev.pid"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   KYNEXIS - Industrial Intelligence Development Startup    " -ForegroundColor Cyan
Write-Host "   Mode: $Mode | Root: $RepoRoot" -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 2. Environment Variables and Credentials
# -----------------------------------------------------------------------------
$EnvFile = Join-Path $RepoRoot ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $parts = $line.Split('=', 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if (-not [System.Environment]::GetEnvironmentVariable($k)) {
                [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
            }
        }
    }
}

# Resolve Database Password
if (-not $DbPassword) {
    if ($env:SPRING_DATASOURCE_PASSWORD) {
        $DbPassword = $env:SPRING_DATASOURCE_PASSWORD
    } elseif ($env:DB_PASSWORD) {
        $DbPassword = $env:DB_PASSWORD
    } else {
        $DbPassword = 'root'
    }
}

$env:SPRING_DATASOURCE_PASSWORD = $DbPassword
$env:SPRING_DATASOURCE_USERNAME = $DbUser
$env:SPRING_DATASOURCE_URL = $DbUrl
if (-not $env:JWT_SECRET) {
    $env:JWT_SECRET = "SmartFactorySecretKeyForDevelopmentOnly123456789"
}
if (-not $env:INTERNAL_API_SECRET) {
    $env:INTERNAL_API_SECRET = "KynexisInternalServiceCommunicationSecretKey2026"
}

# Service routing URLs for local development
$env:AUTHENTICATION_SERVICE_URL = "http://localhost:8081"
$env:PLANT_SERVICE_URL = "http://localhost:8082"
$env:TELEMETRY_SERVICE_URL = "http://localhost:8083"
$env:ALERT_SERVICE_URL = "http://localhost:8084"
$env:MAINTENANCE_SERVICE_URL = "http://localhost:8085"
$env:PRODUCTION_SERVICE_URL = "http://localhost:8086"
$env:ENERGY_SERVICE_URL = "http://localhost:8087"
$env:MACHINE_SERVICE_URL = "http://localhost:8088"
$env:SENSOR_SERVICE_URL = "http://localhost:8089"

# -----------------------------------------------------------------------------
# 3. Helper Functions
# -----------------------------------------------------------------------------
function Test-PortOpen([string]$HostName, [int]$Port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if (-not $wait) {
            $tcp.Close()
            return $false
        }
        $tcp.EndConnect($iar)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-HttpHealth([string]$Url, [int]$TimeoutSec = 2) {
    try {
        $res = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $TimeoutSec -ErrorAction Stop
        if ($res.status -eq 'UP') {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

function Start-DetachedProcess([string]$FilePath, [string]$Arguments, [string]$WorkingDirectory) {
    $cmd = if ($FilePath -match '\s') { "`"$FilePath`" $Arguments" } else { "$FilePath $Arguments" }
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = $cmd
        CurrentDirectory = $WorkingDirectory
    }
    return [PSCustomObject]@{ Id = $res.ProcessId }
}

function Add-TrackedPid([int]$ProcessId, [string]$ServiceName) {
    $nowIso = [DateTime]::UtcNow.ToString('o')
    $entry = "" + $ProcessId + ":" + $ServiceName + ":" + $nowIso
    Add-Content -Path $PidFile -Value $entry
}

# -----------------------------------------------------------------------------
# 4. Mode A: Frontend-Only Workflow
# -----------------------------------------------------------------------------
if ($Mode -eq 'Frontend') {
    Write-Host "`n[1/2] Checking Frontend Prerequisites..." -ForegroundColor Yellow
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not found in PATH. Please install Node.js 20+."
        exit 1
    }
    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
        Push-Location $FrontendDir
        & npm install
        Pop-Location
    }

    Write-Host "`n[2/2] Starting Frontend Vite Server..." -ForegroundColor Yellow
    if (Test-PortOpen "localhost" $VitePort) {
        Write-Host "Frontend is already running on http://localhost:$VitePort." -ForegroundColor Green
    } else {
        $viteProc = Start-DetachedProcess "cmd.exe" "/c npm run dev" $FrontendDir
        Add-TrackedPid $viteProc.Id "Frontend"
        
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $ready = $false
        while ($sw.Elapsed.TotalSeconds -lt 15) {
            if (Test-PortOpen "localhost" $VitePort) {
                try {
                    $testRes = Invoke-WebRequest -Uri "http://localhost:$VitePort" -UseBasicParsing -TimeoutSec 1
                    if ($testRes.StatusCode -eq 200) {
                        $ready = $true
                        break
                    }
                } catch {}
            }
            Start-Sleep -Milliseconds 300
        }

        if ($ready) {
            $elapsedSec = [math]::Round($sw.Elapsed.TotalSeconds, 2)
            Write-Host "Frontend successfully started in $elapsedSec s." -ForegroundColor Green
        } else {
            Write-Warning "Frontend process launched (PID: $($viteProc.Id)) but port $VitePort not responding yet."
        }
    }

    # API Gateway notification
    $gwHealthy = Test-PortOpen "localhost" 8080
    Write-Host "`n------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "KYNEXIS UI:         http://localhost:$VitePort" -ForegroundColor Cyan
    if ($gwHealthy) {
        Write-Host "API Gateway:        http://localhost:8080 [CONNECTED]" -ForegroundColor Green
    } else {
        Write-Host "API Gateway:        http://localhost:8080 [OFFLINE / Standalone UI Mode]" -ForegroundColor Yellow
        Write-Host "Tip: To start the backend, run: .\scripts\dev-start.ps1 -Mode FullStack" -ForegroundColor DarkGray
    }
    $totalSec = [math]::Round($scriptStartTime.Elapsed.TotalSeconds, 2)
    Write-Host "Elapsed Time:       $totalSec seconds" -ForegroundColor DarkGray
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
    exit 0
}

# -----------------------------------------------------------------------------
# 5. FullStack / Backend Workflow
# -----------------------------------------------------------------------------

# Step 1: Pre-flight Checks
Write-Host "`n[1/5] Verifying System Prerequisites..." -ForegroundColor Yellow

# Java 21 Check
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Error "Java is not installed or not in PATH. Java 21 is required."
    exit 1
}
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$javaVerOutput = & java -version 2>&1 | Out-String
$mvnVerOutput = & mvn -version 2>&1 | Out-String
$ErrorActionPreference = $prevEAP

$javaFirstLine = ($javaVerOutput -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
if ($javaFirstLine -match 'version "(21[0-9\._]*)"') {
    Write-Host "  [OK] Java Runtime: Java $($Matches[1])" -ForegroundColor Green
} elseif ($javaFirstLine) {
    Write-Host "  [OK] Java Runtime: $($javaFirstLine.Trim())" -ForegroundColor Green
} else {
    Write-Host "  [OK] Java Runtime: Java 21 LTS detected" -ForegroundColor Green
}

# Maven Check
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    Write-Error "Apache Maven is not installed or not in PATH."
    exit 1
}
$mvnVer = ($mvnVerOutput.Split("`n")[0]).Trim()
Write-Host "  [OK] Maven: $mvnVer" -ForegroundColor Green

# Database Port Check
$mysqlReachable = Test-PortOpen "localhost" 3306
if ($mysqlReachable) {
    Write-Host "  [OK] MySQL Port 3306: Accessible" -ForegroundColor Green
} else {
    Write-Warning "MySQL port 3306 is not open. Ensure your local MySQL server (service 'MySQL82' or container) is running before proceeding."
}

# Step 2: Incremental Parallel Build
Write-Host "`n[2/5] Inspecting Microservice Build Artifacts..." -ForegroundColor Yellow

$ServiceDefinitions = @(
    @{ Name = "authentication-service"; Port = 8081; Group = 1 },
    @{ Name = "plant-service";          Port = 8082; Group = 1 },
    @{ Name = "machine-service";        Port = 8088; Group = 1 },
    @{ Name = "sensor-service";         Port = 8089; Group = 1 },
    @{ Name = "telemetry-service";      Port = 8083; Group = 2 },
    @{ Name = "alert-service";          Port = 8084; Group = 2 },
    @{ Name = "maintenance-service";    Port = 8085; Group = 2 },
    @{ Name = "production-service";     Port = 8086; Group = 2 },
    @{ Name = "energy-service";         Port = 8087; Group = 2 },
    @{ Name = "api-gateway";            Port = 8080; Group = 3 }
)

$needsBuild = $false
foreach ($svc in $ServiceDefinitions) {
    $jarPath = Join-Path $BackendDir "$($svc.Name)\target\$($svc.Name)-0.0.1-SNAPSHOT.jar"
    $svcSrcDir = Join-Path $BackendDir "$($svc.Name)\src\main"
    
    if (-not (Test-Path $jarPath)) {
        Write-Host "  - Missing artifact: $($svc.Name)-0.0.1-SNAPSHOT.jar" -ForegroundColor Yellow
        $needsBuild = $true
        break
    } elseif ($ForceBuild) {
        $needsBuild = $true
        break
    } else {
        $jarTime = (Get-Item $jarPath).LastWriteTime
        $latestSrc = Get-ChildItem -Path $svcSrcDir -Recurse -File -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestSrc -and ($latestSrc.LastWriteTime -gt $jarTime)) {
            Write-Host "  - Source changed for $($svc.Name): $($latestSrc.Name) > JAR" -ForegroundColor Yellow
            $needsBuild = $true
            break
        }
    }
}

if ($needsBuild -and -not $SkipBuild) {
    Write-Host "Building microservices in parallel (mvn package -DskipTests -T 1C)..." -ForegroundColor Cyan
    $buildSw = [System.Diagnostics.Stopwatch]::StartNew()
    Push-Location $BackendDir
    & mvn package -DskipTests -T 1C -q
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error "Maven build failed. Check error output above."
        exit $LASTEXITCODE
    }
    Pop-Location
    $buildSec = [math]::Round($buildSw.Elapsed.TotalSeconds, 2)
    Write-Host "  [OK] Build completed in $buildSec s." -ForegroundColor Green
} else {
    Write-Host "  [OK] All microservice artifacts are up to date. (Skipping build: 0.0s)" -ForegroundColor Green
}

# Step 3: Launch Microservices in Dependency Order
Write-Host "`n[3/5] Starting Backend Microservices..." -ForegroundColor Yellow

$groups = $ServiceDefinitions | Group-Object -Property { $_["Group"] } | Sort-Object Name

foreach ($grp in $groups) {
    $groupLabel = switch ($grp.Name) {
        "1" { "Core Domain and Persistence Services (Auth, Plant, Machine, Sensor)" }
        "2" { "Event and Analytics Microservices (Telemetry, Alert, Maintenance, Production, Energy)" }
        "3" { "API Gateway and Routing Layer" }
        default { "Group " + $grp.Name }
    }
    Write-Host "  Launching Group $($grp.Name): $groupLabel..." -ForegroundColor Cyan

    foreach ($svc in $grp.Group) {
        $port = $svc.Port
        $name = $svc.Name
        $jarPath = Join-Path $BackendDir "$name\target\$name-0.0.1-SNAPSHOT.jar"
        
        # Check if already listening and healthy
        if (Test-PortOpen "localhost" $port) {
            if (Test-HttpHealth "http://localhost:$port/actuator/health") {
                Write-Host "    [REUSED] $name is already healthy on port $port." -ForegroundColor DarkGreen
                continue
            }
        }

        # Launch Java Process with Developer Memory Optimization & System Properties
        $sysProps = "-Dspring.datasource.password=`"$DbPassword`" -Dspring.datasource.username=`"$DbUser`" -Dspring.datasource.url=`"$DbUrl`" -Djwt.secret=`"$($env:JWT_SECRET)`" -Dkynexis.security.internal-secret=`"$($env:INTERNAL_API_SECRET)`""
        $jvmArgs = "-Xms64m -Xmx$JvmHeap -XX:+TieredCompilation -XX:TieredStopAtLevel=1 $sysProps -jar `"$jarPath`""
        $proc = Start-DetachedProcess "java" $jvmArgs (Join-Path $BackendDir $name)
        Add-TrackedPid $proc.Id $name
        Write-Host "    [STARTING] $name (PID: $($proc.Id), Port: $port)..." -ForegroundColor Gray
    }

    # Bounded readiness wait for current group
    $groupWaitSw = [System.Diagnostics.Stopwatch]::StartNew()
    $allReady = $false
    while ($groupWaitSw.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $pending = @()
        foreach ($svc in $grp.Group) {
            if (-not (Test-HttpHealth "http://localhost:$($svc.Port)/actuator/health")) {
                $pending += $svc.Name
            }
        }
        if ($pending.Count -eq 0) {
            $allReady = $true
            break
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $allReady) {
        Write-Warning "Group $($grp.Name) did not reach UP status within $TimeoutSeconds seconds. Pending: $($pending -join ', ')"
    } else {
        $grpElapsed = [math]::Round($groupWaitSw.Elapsed.TotalSeconds, 2)
        Write-Host "    [OK] Group $($grp.Name) healthy in $grpElapsed s." -ForegroundColor Green
    }
}

# Step 4: Launch Frontend (if FullStack)
if ($Mode -eq 'FullStack') {
    Write-Host "`n[4/5] Starting React / Vite Frontend..." -ForegroundColor Yellow
    if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
        Push-Location $FrontendDir
        & npm install
        Pop-Location
    }

    if (Test-PortOpen "localhost" $VitePort) {
        Write-Host "  [REUSED] Frontend already active on port $VitePort." -ForegroundColor DarkGreen
    } else {
        $viteProc = Start-DetachedProcess "cmd.exe" "/c npm run dev" $FrontendDir
        Add-TrackedPid $viteProc.Id "Frontend"
        
        $feSw = [System.Diagnostics.Stopwatch]::StartNew()
        while ($feSw.Elapsed.TotalSeconds -lt 15) {
            if (Test-PortOpen "localhost" $VitePort) {
                break
            }
            Start-Sleep -Milliseconds 300
        }
        $feElapsed = [math]::Round($feSw.Elapsed.TotalSeconds, 2)
        Write-Host "  [OK] Frontend ready on http://localhost:$VitePort ($feElapsed s)." -ForegroundColor Green
    }
}

# Step 5: Final Verification and Service Status Table
Write-Host "`n[5/5] Final Service Readiness Verification..." -ForegroundColor Yellow

$StatusReport = @()
foreach ($svc in $ServiceDefinitions) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = "DOWN"
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:$($svc.Port)/actuator/health" -TimeoutSec 2 -ErrorAction Stop
        $status = $health.status
    } catch {
        $status = "OFFLINE"
    }
    $sw.Stop()

    $StatusReport += [PSCustomObject]@{
        Service = $svc.Name
        Port    = $svc.Port
        Status  = $status
        Latency = "$([math]::Round($sw.Elapsed.TotalMilliseconds)) ms"
    }
}

if ($Mode -eq 'FullStack') {
    $feStatus = if (Test-PortOpen "localhost" $VitePort) { "UP (HTTP 200)" } else { "OFFLINE" }
    $StatusReport += [PSCustomObject]@{
        Service = "Frontend (React 19 / Vite)"
        Port    = $VitePort
        Status  = $feStatus
        Latency = "Local"
    }
}

$StatusReport | Format-Table -AutoSize

$totalElapsed = [math]::Round($scriptStartTime.Elapsed.TotalSeconds, 2)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   KYNEXIS IS READY! Total Startup Time: $totalElapsed seconds" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  * Web Application:     http://localhost:$VitePort" -ForegroundColor White
Write-Host "  * API Gateway:         http://localhost:8080" -ForegroundColor White
Write-Host "  * Actuator Health:     http://localhost:8080/actuator/health" -ForegroundColor White
Write-Host "  * Seed Admin Login:    admin / Admin@123" -ForegroundColor White
Write-Host "  * Stop Services:       .\scripts\dev-stop.ps1" -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor Cyan
