# List available Gemini models

$apiKey = "AIzaSyD3QHSw5ND0tkHzUztnDLmxI2C7su0B6ic"
$headers = @{
    "x-goog-api-key" = $apiKey
}

Write-Host "Fetching available Gemini models..." -ForegroundColor Cyan

$response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models" -Headers $headers

Write-Host "`nModels that support generateContent:" -ForegroundColor Yellow

$models = $response.models | Where-Object { $_.supportedGenerationMethods -contains "generateContent" }

Write-Host "Total models found: $($models.Count)`n" -ForegroundColor White

$models | ForEach-Object {
    Write-Host "  - $($_.name)" -ForegroundColor Green
}

Write-Host "`nRecommended models:" -ForegroundColor Yellow
Write-Host "  - gemini-1.5-flash-002" -ForegroundColor Cyan
Write-Host "  - gemini-1.5-pro-002" -ForegroundColor Cyan
