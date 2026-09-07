param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$previewUrl = 'http://127.0.0.1:4173'
$logRoot = Join-Path $projectRoot '.preview'
function Test-ShopPreview {
    try {
        $response = Invoke-RestMethod -Uri "$previewUrl/__bc/health" -TimeoutSec 2
        return $response.app -eq 'bad-children-shop' -and $response.root -eq $projectRoot
    } catch { return $false }
}
try {
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist/index.html'))) {
        throw 'The built page is missing. Run npm run build in the project folder first.'
    }
    if (-not (Test-ShopPreview)) {
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
        if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js was not found. Install Node.js or open this project in Codex.' }
        New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
        $serverScript = Join-Path $PSScriptRoot 'serve.mjs'
        $serverProcess = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot 'server.log') -RedirectStandardError (Join-Path $logRoot 'server-error.log') -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 24; $attempt++) {
            Start-Sleep -Milliseconds 250
            if (Test-ShopPreview) { $ready = $true; break }
            if ($serverProcess.HasExited) { break }
        }
        if (-not $ready) { throw 'Preview could not start. Check .preview/server-error.log. Another app may be using port 4173.' }
    }
    if (-not $NoBrowser) { Start-Process $previewUrl }
    Write-Output "Ready: $previewUrl"
} catch {
    if ($NoBrowser) { throw }
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Bad Children Shop') | Out-Null
    exit 1
}
