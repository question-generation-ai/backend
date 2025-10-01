# Test A/B testing feature (Model B)

Write-Host "Testing A/B Testing (Gemini vs OpenAI)..." -ForegroundColor Cyan

$body = '{"subject":"Physics","chapter":"Motion","difficulty":"medium","type":"short-answer","count":1,"classLevel":"Grade 11"}'

Write-Host "Sending A/B request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/questions/ab-generate" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 120

    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host "`n=== GEMINI RESULTS ===" -ForegroundColor Cyan
    Write-Host "Questions: $($response.gemini.questions.Count)" -ForegroundColor Green
    Write-Host "Provider: $($response.gemini.provider)" -ForegroundColor Green
    if ($response.gemini.questions -and $response.gemini.questions.Count -gt 0) {
        $geminiSample = $response.gemini.questions[0].question
        $geminiLen = [Math]::Min(100, $geminiSample.Length)
        Write-Host "Sample: $($geminiSample.Substring(0, $geminiLen))..." -ForegroundColor White
    }

    Write-Host "`n=== OPENAI RESULTS ===" -ForegroundColor Cyan
    Write-Host "Questions: $($response.openai.questions.Count)" -ForegroundColor Green
    Write-Host "Provider: $($response.openai.provider)" -ForegroundColor Green
    if ($response.openai.questions -and $response.openai.questions.Count -gt 0) {
        $openaiSample = $response.openai.questions[0].question
        $openaiLen = [Math]::Min(100, $openaiSample.Length)
        Write-Host "Sample: $($openaiSample.Substring(0, $openaiLen))..." -ForegroundColor White
    }

    Write-Host "`n✓ A/B Testing working correctly!" -ForegroundColor Green
} catch {
    Write-Host "`n✗ A/B test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
