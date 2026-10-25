<#
.SYNOPSIS
    KYNEXIS - Real-Time Development Services Health and Port Status

.DESCRIPTION
    Checks all 10 microservices, the API Gateway, and the React frontend,
    reporting their listening ports, HTTP health status, and response latency.

.EXAMPLE
    .\scripts\dev-status.ps1
#>

[CmdletBinding()]
param()

$ServiceDefinitions = @(
    @{ Name = "Frontend (React 19 / Vite)"; Port = 5173; HealthUrl = "http://localhost:5173/" },
    @{ Name = "API Gateway";               Port = 8080; HealthUrl = "http://localhost:8080/actuator/health" },
    @{ Name = "Authentication Service";    Port = 8081; HealthUrl = "http://localhost:8081/actuator/health" },
    @{ Name = "Plant Service";             Port = 8082; HealthUrl = "http://localhost:8082/actuator/health" },
    @{ Name = "Telemetry Service";         Port = 8083; HealthUrl = "http://localhost:8083/actuator/health" },
    @{ Name = "Alert Service";             Port = 8084; HealthUrl = "http://localhost:8084/actuator/health" },
    @{ Name = "Maintenance Service";       Port = 8085; HealthUrl = "http://localhost:8085/actuator/health" },
    @{ Name = "Production Service";        Port = 8086; HealthUrl = "http://localhost:8086/actuator/health" },
    @{ Name = "Energy Service";            Port = 8087; HealthUrl = "http://localhost:8087/actuator/health" },
    @{ Name = "Machine Service";           Port = 8088; HealthUrl = "http://localhost:8088/actuator/health" },
    @{ Name = "Sensor Service";            Port = 8089; HealthUrl = "http://localhost:8089/actuator/health" }
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   KYNEXIS - Services and Infrastructure Health Status      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Check Infrastructure
$mysqlConn = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
$mysqlStatus = if ($mysqlConn) { "LISTENING (Port 3306)" } else { "CLOSED" }
$mysqlColor = if ($mysqlConn) { "Green" } else { "Yellow" }
Write-Host "MySQL Service:       $mysqlStatus" -ForegroundColor $mysqlColor

$kafkaConn = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
$kafkaStatus = if ($kafkaConn) { "LISTENING (Port 9092)" } else { "CLOSED (Optional for Telemetry/Alert)" }
$kafkaColor = if ($kafkaConn) { "Green" } else { "DarkGray" }
Write-Host "Kafka Broker:        $kafkaStatus" -ForegroundColor $kafkaColor

Write-Host "`nMicroservices and Web Application:" -ForegroundColor Yellow

$results = @()
foreach ($svc in $ServiceDefinitions) {
    $port = $svc.Port
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $pids = if ($conn) { ($conn.OwningProcess | Select-Object -Unique) -join ', ' } else { "-" }
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = "OFFLINE"
    if ($conn) {
        try {
            if ($port -eq 5173) {
                $fe = Invoke-WebRequest -Uri $svc.HealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                $status = "UP (HTTP $($fe.StatusCode))"
            } else {
                $res = Invoke-RestMethod -Uri $svc.HealthUrl -TimeoutSec 2 -ErrorAction Stop
                $status = $res.status
            }
        } catch {
            $status = "PORT OPEN (Health Unresponsive)"
        }
    }
    $sw.Stop()

    $results += [PSCustomObject]@{
        Service = $svc.Name
        Port    = $port
        PID     = $pids
        Status  = $status
        Latency = if ($conn) { "$([math]::Round($sw.Elapsed.TotalMilliseconds)) ms" } else { "-" }
    }
}

$results | Format-Table -AutoSize
Write-Host "============================================================`n" -ForegroundColor Cyan
