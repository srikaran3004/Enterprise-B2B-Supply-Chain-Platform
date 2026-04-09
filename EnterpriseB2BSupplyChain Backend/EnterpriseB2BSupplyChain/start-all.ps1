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
        Start-Process -FilePath "dotnet" -ArgumentList "run --project `"$service`"" -NoNewWindow -RedirectStandardOutput "$name-out.log" -RedirectStandardError "$name-err.log"
    } else {
        Write-Warning "Could not find $service"
    }
}
Write-Host "All services started."
