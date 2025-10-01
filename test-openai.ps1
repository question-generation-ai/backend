# Test OpenAI directly

Write-Host "Testing OpenAI API..." -ForegroundColor Cyan

$body = '{"subject":"Mathematics","chapter":"Algebra","difficulty":"easy","type":"multiple-choice","count":1,"classLevel":"Grade 10","provider":"openai"}'

Write-Host "Sending request..." -ForegroundColor Yellow

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 90

Write-Host "Success!" -ForegroundColor Green
Write-Host "Questions generated: $($response.questions.Count)" -ForegroundColor Green
Write-Host "Provider: $($response.provider)" -ForegroundColor Green
