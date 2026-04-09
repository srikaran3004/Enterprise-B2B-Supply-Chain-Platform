try {
    $connString = 'Server=.\SQLEXPRESS;Database=LogisticsDB;Integrated Security=True;TrustServerCertificate=True'
    $conn = [System.Data.SqlClient.SqlConnection]::new($connString)
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = 'SELECT s.ShipmentId, s.OrderId, s.Status, a.FullName AS AgentName, v.RegistrationNo as VehicleNo FROM Shipments s LEFT JOIN DeliveryAgents a ON s.AgentId = a.AgentId LEFT JOIN Vehicles v ON s.VehicleId = v.VehicleId'
    $reader = $cmd.ExecuteReader()
    $found = $false
    while ($reader.Read()) {
        $found = $true
        Write-Host "Order: $($reader['OrderId']), Status: $($reader['Status']), Agent: $($reader['AgentName']), Vehicle: $($reader['VehicleNo'])"
    }
    if (-not $found) { Write-Host "No shipments found." }
    $conn.Close()
} catch {
    Write-Host "Error: " $_.Exception.Message ""
}
