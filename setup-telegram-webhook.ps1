# Telegram Webhook Setup Script

$botToken = "8223281731:AAEUlmDSJCG1RVm2uGOSX-atnQiLEXNfXd8"
$webhookUrl = "https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-webhook"
$telegramApiUrl = "https://api.telegram.org/bot$botToken/setWebhook"

Write-Host "Setting up Telegram webhook..." -ForegroundColor Yellow

try {
    $body = @{
        url = $webhookUrl
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri $telegramApiUrl -Method Post -Body $body -ContentType "application/json"

    if ($response.ok -eq $true) {
        Write-Host "SUCCESS! Webhook configured successfully!" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: $($response.description)" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
