$servicePorts = @(5000, 5002, 5004, 5006, 5008, 5010, 5012)

function Stop-SupplyChainProcesses {
    param([int[]]$Ports)

    foreach ($port in $Ports) {
        $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($listener in $listeners) {
            try {
                Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
                Write-Host "Stopped existing process on port $port (PID: $($listener.OwningProcess))."
            } catch {
                Write-Warning "Could not stop process on port $port (PID: $($listener.OwningProcess)). $_"
            }
        }
    }
}

Stop-SupplyChainProcesses -Ports $servicePorts

$services = @(
    "src\Gateway\SupplyChain.Gateway\SupplyChain.Gateway.csproj",
    "src\Services\Identity\SupplyChain.Identity.API\SupplyChain.Identity.API.csproj",
    "src\Services\Catalog\SupplyChain.Catalog.API\SupplyChain.Catalog.API.csproj",
    "src\Services\Order\SupplyChain.Order.API\SupplyChain.Order.API.csproj",
    "src\Services\Logistics\SupplyChain.Logistics.API\SupplyChain.Logistics.API.csproj",
    "src\Services\Payment\SupplyChain.Payment.API\SupplyChain.Payment.API.csproj",
    "src\Services\Notification\SupplyChain.Notification.API\SupplyChain.Notification.API.csproj"
)

foreach ($service in $services) {
    if (Test-Path $service) {
        $name = (Get-Item $service).BaseName
        Write-Host "Starting $name..."
        Start-Process -FilePath "dotnet" -ArgumentList "run --project `"$service`"" -WindowStyle Hidden
    } else {
        Write-Warning "Could not find $service"
    }
}
Write-Host "All services started."
