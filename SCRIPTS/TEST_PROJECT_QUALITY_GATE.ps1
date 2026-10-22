[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'INVOKE_PROJECT_QUALITY_GATE.ps1'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ("quality-gate-test-{0}" -f [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path (Join-Path $testRoot '.ai') -Force | Out-Null

try {
    $passConfig = [ordered]@{
        schemaVersion = 1
        checks = @(
            [ordered]@{ name = 'pass'; profiles = @('quick', 'full'); command = 'exit /b 0'; required = $true; notApplicableReason = ''; timeoutSeconds = 30 },
            [ordered]@{ name = 'skip'; profiles = @('full'); command = ''; required = $false; notApplicableReason = 'Not used in this fixture.'; timeoutSeconds = 30 }
        )
    }
    $passConfig | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $testRoot '.ai\quality-gate.json') -Encoding UTF8
    $passReport = Join-Path $testRoot 'pass-report.json'
    & $scriptPath -ProjectPath $testRoot -Profile full -ReportPath $passReport
    if ($LASTEXITCODE -ne 0) { throw 'Expected passing fixture to pass.' }
    $passResult = Get-Content -LiteralPath $passReport -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($passResult.status -ne 'passed' -or $passResult.checks.Count -ne 2) { throw 'Passing report is invalid.' }

    $failConfig = [ordered]@{
        schemaVersion = 1
        checks = @(
            [ordered]@{ name = 'fail'; profiles = @('full'); command = 'exit /b 7'; required = $true; notApplicableReason = ''; timeoutSeconds = 30 },
            [ordered]@{ name = 'must-not-run'; profiles = @('full'); command = 'exit /b 0'; required = $true; notApplicableReason = ''; timeoutSeconds = 30 }
        )
    }
    $failConfig | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $testRoot '.ai\quality-gate.json') -Encoding UTF8
    $failReport = Join-Path $testRoot 'fail-report.json'
    & $scriptPath -ProjectPath $testRoot -Profile full -ReportPath $failReport
    if ($LASTEXITCODE -eq 0) { throw 'Expected failing fixture to fail.' }
    $failResult = Get-Content -LiteralPath $failReport -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($failResult.status -ne 'failed' -or $failResult.checks.Count -ne 1 -or $failResult.checks[0].exitCode -ne 7) { throw 'Fail-fast report is invalid.' }

    Write-Host 'Quality gate tests: PASSED'
}
finally {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}

exit 0
