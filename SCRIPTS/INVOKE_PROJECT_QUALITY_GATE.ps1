[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [ValidateSet('quick', 'full')]
    [string]$Profile = 'full',

    [string]$ConfigPath,

    [string]$ReportPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath $ProjectPath).Path

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    $ConfigPath = Join-Path $projectRoot '.ai\quality-gate.json'
}
elseif (-not [IO.Path]::IsPathRooted($ConfigPath)) {
    $ConfigPath = Join-Path $projectRoot $ConfigPath
}

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
    throw "Quality gate config not found: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($config.schemaVersion -ne 1) {
    throw "Unsupported quality gate schemaVersion: $($config.schemaVersion)"
}

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $reportDirectory = Join-Path ([IO.Path]::GetTempPath()) 'ai-software-studio-quality-gates'
    New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
    $ReportPath = Join-Path $reportDirectory ("quality-gate-{0}.json" -f [guid]::NewGuid().ToString('N'))
}
elseif (-not [IO.Path]::IsPathRooted($ReportPath)) {
    $ReportPath = Join-Path $projectRoot $ReportPath
}

$reportParent = Split-Path -Parent $ReportPath
if ($reportParent) {
    New-Item -ItemType Directory -Path $reportParent -Force | Out-Null
}

$gitCommit = $null
if (Test-Path -LiteralPath (Join-Path $projectRoot '.git')) {
    $gitCommit = (& git -C $projectRoot rev-parse HEAD 2>$null | Select-Object -First 1)
}

$results = [System.Collections.Generic.List[object]]::new()
$overallStatus = 'passed'
$startedAt = (Get-Date).ToUniversalTime().ToString('o')

foreach ($check in @($config.checks)) {
    if (@($check.profiles) -notcontains $Profile) { continue }

    $name = [string]$check.name
    $command = [string]$check.command
    $required = [bool]$check.required
    $timeoutSeconds = [int]$check.timeoutSeconds
    if ($timeoutSeconds -le 0) { $timeoutSeconds = 600 }

    if ([string]::IsNullOrWhiteSpace($command)) {
        $reason = [string]$check.notApplicableReason
        if ($required -or [string]::IsNullOrWhiteSpace($reason)) {
            $results.Add([pscustomobject]@{ name = $name; status = 'failed'; command = $command; exitCode = $null; durationMs = 0; summary = 'Required command or notApplicableReason is missing.' })
            $overallStatus = 'failed'
            break
        }
        $results.Add([pscustomobject]@{ name = $name; status = 'not_applicable'; command = ''; exitCode = $null; durationMs = 0; summary = $reason })
        continue
    }

    $watch = [Diagnostics.Stopwatch]::StartNew()

    try {
        $startInfo = [Diagnostics.ProcessStartInfo]::new()
        if ($IsLinux -or $IsMacOS) {
            $startInfo.FileName = '/bin/sh'
            $startInfo.Arguments = "-lc `"$($command.Replace('`"', '\`"'))`""
        }
        else {
            $startInfo.FileName = 'cmd.exe'
            $startInfo.Arguments = "/d /s /c `"$command`""
        }
        $startInfo.WorkingDirectory = $projectRoot
        $startInfo.UseShellExecute = $false
        $startInfo.CreateNoWindow = $true
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true

        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $startInfo
        if (-not $process.Start()) { throw "Unable to start check: $name" }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()

        $completed = $process.WaitForExit($timeoutSeconds * 1000)
        if (-not $completed) {
            $process.Kill()
            $process.WaitForExit()
            $exitCode = $null
            $status = 'failed'
            $summary = "Timed out after $timeoutSeconds seconds."
        }
        else {
            $exitCode = $process.ExitCode
            $status = if ($exitCode -eq 0) { 'passed' } else { 'failed' }
            $summary = @($stdoutTask.Result, $stderrTask.Result) -join [Environment]::NewLine
            if ($summary.Length -gt 12000) { $summary = $summary.Substring($summary.Length - 12000) }
            $summary = $summary -replace 'gh[opsu]_[A-Za-z0-9]{20,}', '[REDACTED_GITHUB_TOKEN]'
            $summary = $summary -replace 'github_pat_[A-Za-z0-9_]{20,}', '[REDACTED_GITHUB_TOKEN]'
            $summary = $summary -replace '(?i)(authorization:\s*bearer\s+)[^\s]+', '$1[REDACTED]'
            $summary = $summary -replace '(?i)((password|secret|token)\s*[:=]\s*)[^\s]+', '$1[REDACTED]'
        }
    }
    finally {
        $watch.Stop()
        if ($process) { $process.Dispose() }
    }

    $results.Add([pscustomobject]@{ name = $name; status = $status; command = $command; exitCode = $exitCode; durationMs = $watch.ElapsedMilliseconds; summary = $summary })
    if ($status -eq 'failed') {
        $overallStatus = 'failed'
        if ($required) { break }
    }
}

$report = [ordered]@{
    schemaVersion = 1
    status = $overallStatus
    profile = $Profile
    projectPath = $projectRoot
    gitCommit = $gitCommit
    startedAt = $startedAt
    checks = @($results)
}

$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
Write-Host "Quality gate result: $overallStatus"
Write-Host "Report: $ReportPath"

if ($overallStatus -ne 'passed') { exit 1 }
exit 0
