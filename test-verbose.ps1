# Verbose test to see actual errors

Write-Host "Testing Gemini API with verbose output..." -ForegroundColor Cyan

$body = '{"subject":"Mathematics","chapter":"Algebra","difficulty":"easy","type":"multiple-choice","count":1,"classLevel":"Grade 10","provider":"gemini"}'

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 90 -Verbose
    
    Write-Host "`nResponse received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    
    if ($response.metadata.source -eq "mock") {
        Write-Host "`nWARNING: Received mock data!" -ForegroundColor Red
        Write-Host "Note: $($response.metadata.note)" -ForegroundColor Yellow
    } else {
        Write-Host "`nSUCCESS: Real AI data!" -ForegroundColor Green
    }
} catch {
    Write-Host "`nError occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}
