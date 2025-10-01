# Simple test script for Question Generator API

Write-Host "Testing Gemini API..." -ForegroundColor Cyan

$body = '{"subject":"Mathematics","chapter":"Algebra","difficulty":"easy","type":"multiple-choice","count":2,"classLevel":"Grade 10","provider":"gemini"}'

Write-Host "Sending request..." -ForegroundColor Yellow

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 90

Write-Host "Success!" -ForegroundColor Green
Write-Host "Questions generated: $($response.questions.Count)" -ForegroundColor Green
Write-Host "Provider: $($response.provider)" -ForegroundColor Green

if ($response.questions -and $response.questions.Count -gt 0) {
    Write-Host "`nFirst question:" -ForegroundColor Cyan
    Write-Host $response.questions[0].question -ForegroundColor White
}
