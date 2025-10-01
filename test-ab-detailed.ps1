# Test A/B testing feature with detailed output

Write-Host "Testing A/B Testing (Gemini vs OpenAI)..." -ForegroundColor Cyan

$body = '{"subject":"Chemistry","chapter":"Atomic Structure","difficulty":"easy","type":"multiple-choice","count":2,"classLevel":"Grade 10"}'

Write-Host "Sending A/B request..." -ForegroundColor Yellow

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/ab-generate" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 120

Write-Host "`nSuccess!" -ForegroundColor Green

Write-Host "`n=== GEMINI RESULTS ===" -ForegroundColor Cyan
Write-Host "Response type: $($response.gemini.GetType().Name)" -ForegroundColor Gray
Write-Host "Has questions property: $($response.gemini.questions -ne $null)" -ForegroundColor Gray
if ($response.gemini.questions) {
    Write-Host "Questions count: $($response.gemini.questions.Count)" -ForegroundColor Green
    Write-Host "Questions type: $($response.gemini.questions.GetType().Name)" -ForegroundColor Gray
}

Write-Host "`n=== OPENAI RESULTS ===" -ForegroundColor Cyan
Write-Host "Response type: $($response.openai.GetType().Name)" -ForegroundColor Gray
Write-Host "Has questions property: $($response.openai.questions -ne $null)" -ForegroundColor Gray
if ($response.openai.questions) {
    Write-Host "Questions count: $($response.openai.questions.Count)" -ForegroundColor Green
    Write-Host "Questions type: $($response.openai.questions.GetType().Name)" -ForegroundColor Gray
}

Write-Host "`n=== RAW JSON ===" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 5
