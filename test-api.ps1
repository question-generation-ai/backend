# Test script for Question Generator API

Write-Host "Testing Gemini API with corrected model configuration..." -ForegroundColor Cyan

# Test 1: Simple question generation with Gemini
Write-Host "`n=== Test 1: Gemini Question Generation ===" -ForegroundColor Yellow
$body1 = @{
    subject = "Mathematics"
    chapter = "Algebra"
    difficulty = "easy"
    type = "multiple-choice"
    count = 2
    classLevel = "Grade 10"
    provider = "gemini"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body1 `
        -TimeoutSec 60
    
    Write-Host "✓ Gemini test successful!" -ForegroundColor Green
    Write-Host "Generated questions: $($response1.questions.Count)" -ForegroundColor Green
    $cacheStatus = if ($response1.cached) { "HIT" } else { "MISS" }
    Write-Host "Cache status: $cacheStatus" -ForegroundColor Green
} catch {
    Write-Host "✗ Gemini test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

# Test 2: A/B Testing (Model B)
Write-Host "`n=== Test 2: A/B Testing (Gemini vs OpenAI) ===" -ForegroundColor Yellow
$body2 = @{
    subject = "Physics"
    chapter = "Newton's Laws"
    difficulty = "medium"
    type = "short-answer"
    count = 1
    classLevel = "Grade 11"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/ab-generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body2 `
        -TimeoutSec 60
    
    Write-Host "✓ A/B test successful!" -ForegroundColor Green
    Write-Host "Gemini questions: $($response2.gemini.questions.Count)" -ForegroundColor Green
    Write-Host "OpenAI questions: $($response2.openai.questions.Count)" -ForegroundColor Green
} catch {
    Write-Host "✗ A/B test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: OpenAI direct test
Write-Host "`n=== Test 3: OpenAI Question Generation ===" -ForegroundColor Yellow
$body3 = @{
    subject = "Biology"
    chapter = "Cell Structure"
    difficulty = "easy"
    type = "true-false"
    count = 2
    classLevel = "Grade 9"
    provider = "openai"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body3 `
        -TimeoutSec 60
    
    Write-Host "✓ OpenAI test successful!" -ForegroundColor Green
    Write-Host "Generated questions: $($response3.questions.Count)" -ForegroundColor Green
} catch {
    Write-Host "✗ OpenAI test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
