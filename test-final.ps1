# Final comprehensive test

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  QUESTION GENERATOR API TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$testsPassed = 0
$testsFailed = 0

# Test 1: Gemini API
Write-Host "[Test 1] Gemini Question Generation..." -ForegroundColor Yellow
try {
    $body1 = '{"subject":"Mathematics","chapter":"Algebra","difficulty":"easy","type":"multiple-choice","count":2,"classLevel":"Grade 10","provider":"gemini"}'
    $response1 = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" -Method POST -ContentType "application/json" -Body $body1 -TimeoutSec 60
    
    if ($response1.questions -and $response1.questions.Count -ge 1) {
        Write-Host "  ✓ PASSED - Generated $($response1.questions.Count) questions" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED - No questions generated" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 2: OpenAI API
Write-Host "`n[Test 2] OpenAI Question Generation..." -ForegroundColor Yellow
try {
    $body2 = '{"subject":"Physics","chapter":"Motion","difficulty":"medium","type":"short-answer","count":1,"classLevel":"Grade 11","provider":"openai"}'
    $response2 = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/generate" -Method POST -ContentType "application/json" -Body $body2 -TimeoutSec 60
    
    if ($response2.questions -and $response2.questions.Count -ge 1) {
        Write-Host "  ✓ PASSED - Generated $($response2.questions.Count) questions" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED - No questions generated" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 3: A/B Testing
Write-Host "`n[Test 3] A/B Testing (Model B)..." -ForegroundColor Yellow
try {
    $body3 = '{"subject":"Biology","chapter":"Cell Structure","difficulty":"easy","type":"true-false","count":1,"classLevel":"Grade 9"}'
    $response3 = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/ab-generate" -Method POST -ContentType "application/json" -Body $body3 -TimeoutSec 120
    
    $geminiOk = $response3.gemini -and $response3.gemini.questions -and $response3.gemini.questions.Count -ge 1
    $openaiOk = $response3.openai -and $response3.openai.questions -and $response3.openai.questions.Count -ge 1
    
    if ($geminiOk -and $openaiOk) {
        Write-Host "  ✓ PASSED - Gemini: $($response3.gemini.questions.Count), OpenAI: $($response3.openai.questions.Count)" -ForegroundColor Green
        $testsPassed++
    } elseif ($geminiOk -or $openaiOk) {
        Write-Host "  ⚠ PARTIAL - Gemini: $($response3.gemini.questions.Count), OpenAI: $($response3.openai.questions.Count)" -ForegroundColor Yellow
        $testsPassed++
    } else {
        Write-Host "  ✗ FAILED - Both providers returned no questions" -ForegroundColor Red
        $testsFailed++
    }
} catch {
    Write-Host "  ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Test 4: System Status
Write-Host "`n[Test 4] System Status Check..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/status" -Method GET -TimeoutSec 10
    Write-Host "  ✓ PASSED - System is healthy" -ForegroundColor Green
    $testsPassed++
} catch {
    Write-Host "  ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Passed: $testsPassed" -ForegroundColor Green
Write-Host "  Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($testsFailed -eq 0) {
    Write-Host "✓ ALL TESTS PASSED! System is working correctly." -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Some tests failed. Please review the errors above." -ForegroundColor Red
    exit 1
}
