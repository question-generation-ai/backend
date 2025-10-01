# Test A/B testing feature

Write-Host "Testing A/B Testing..." -ForegroundColor Cyan

$body = '{"subject":"Physics","chapter":"Motion","difficulty":"medium","type":"short-answer","count":1,"classLevel":"Grade 11"}'

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/ab-generate" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 120

Write-Host "Success!" -ForegroundColor Green
Write-Host "Gemini questions: $($response.gemini.questions.Count)" -ForegroundColor Green
Write-Host "OpenAI questions: $($response.openai.questions.Count)" -ForegroundColor Green
