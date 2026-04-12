param(
    [string]$SourceConfig = "src/Services/Identity/SupplyChain.Identity.API/appsettings.Development.json"
)

$ErrorActionPreference = "Stop"

$identityProject = "src/Services/Identity/SupplyChain.Identity.API/SupplyChain.Identity.API.csproj"
$notificationProject = "src/Services/Notification/SupplyChain.Notification.API/SupplyChain.Notification.API.csproj"

if (-not (Test-Path $SourceConfig)) {
    throw "Source config not found: $SourceConfig"
}

$json = Get-Content -Raw -Path $SourceConfig | ConvertFrom-Json
if (-not $json.Email) {
    throw "No Email section found in $SourceConfig"
}

$email = $json.Email
$required = @("SmtpHost", "SmtpPort", "Username", "Password", "FromAddress")
foreach ($k in $required) {
    if ([string]::IsNullOrWhiteSpace($email.$k)) {
        throw "Email:$k is missing in $SourceConfig"
    }
}

function Test-Placeholder([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return $true }
    $v = $value.Trim().ToLowerInvariant()
    return $v -eq "your-email@gmail.com" -or $v -eq "your-app-password" -or $v.Contains("your-email") -or $v.Contains("your-app-password")
}

if (Test-Placeholder $email.Username -or Test-Placeholder $email.Password) {
    throw "Source config still has placeholder credentials. Put real SMTP values temporarily in $SourceConfig or set secrets manually with dotnet user-secrets set."
}

$targets = @($identityProject, $notificationProject)

foreach ($proj in $targets) {
    if (-not (Test-Path $proj)) {
        throw "Project not found: $proj"
    }

    Write-Host "Importing SMTP secrets into $proj"
    dotnet user-secrets set "Email:SmtpHost" "$($email.SmtpHost)" --project "$proj" | Out-Null
    dotnet user-secrets set "Email:SmtpPort" "$($email.SmtpPort)" --project "$proj" | Out-Null
    dotnet user-secrets set "Email:Username" "$($email.Username)" --project "$proj" | Out-Null
    dotnet user-secrets set "Email:Password" "$($email.Password)" --project "$proj" | Out-Null
    dotnet user-secrets set "Email:FromAddress" "$($email.FromAddress)" --project "$proj" | Out-Null

    if (-not [string]::IsNullOrWhiteSpace($email.FromName)) {
        dotnet user-secrets set "Email:FromName" "$($email.FromName)" --project "$proj" | Out-Null
    }
}

Write-Host "Email secrets imported successfully for Identity + Notification."
Write-Host "Next step: remove plain-text secrets from appsettings.Development.json files."
