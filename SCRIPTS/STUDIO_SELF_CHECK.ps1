[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$studioRoot = Split-Path -Parent $PSScriptRoot
$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
$projectHeadings = @()

$requiredFiles = @(
    'AGENTS.md',
    'AI_STUDIO_ENTRY.md',
    'PROJECT_STATUS.md',
    'PROJECTS\PROJECT_REGISTRY.md',
    'CORE_RULES\QUALITY_GATE_RULES.md',
    'CORE_RULES\ROLE_HANDOFF_RULES.md',
    'CORE_RULES\THIRD_PARTY_REFERENCE_RULES.md',
    'SCRIPTS\INVOKE_PROJECT_QUALITY_GATE.ps1',
    'SCRIPTS\TEST_PROJECT_QUALITY_GATE.ps1',
    'TEMPLATES\PROJECT_QUALITY_GATE.example.json',
    'TEMPLATES\ROLE_HANDOFF_TEMPLATE.md'
)
$requiredDirectories = @('CORE_RULES', 'KNOWLEDGE_BASE', 'PROJECTS', 'ROLES', 'SCRIPTS', 'TEMPLATES')

foreach ($relativePath in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $studioRoot $relativePath) -PathType Leaf)) {
        $errors.Add("Missing required file: $relativePath")
    }
}

foreach ($relativePath in $requiredDirectories) {
    if (-not (Test-Path -LiteralPath (Join-Path $studioRoot $relativePath) -PathType Container)) {
        $errors.Add("Missing required directory: $relativePath")
    }
}

$projectsPath = Join-Path $studioRoot 'PROJECTS'
if (Test-Path -LiteralPath $projectsPath) {
    foreach ($directory in @(Get-ChildItem -LiteralPath $projectsPath -Directory -Force)) {
        $errors.Add("Business directory found under PROJECTS: $($directory.Name)")
    }
    foreach ($file in @(Get-ChildItem -LiteralPath $projectsPath -File -Force | Where-Object Name -ne 'PROJECT_REGISTRY.md')) {
        $errors.Add("Unexpected file found under PROJECTS: $($file.Name)")
    }
}

$registryPath = Join-Path $studioRoot 'PROJECTS\PROJECT_REGISTRY.md'
if (Test-Path -LiteralPath $registryPath -PathType Leaf) {
    $registryText = Get-Content -LiteralPath $registryPath -Raw -Encoding UTF8
    $projectHeadings = @([regex]::Matches($registryText, '(?m)^##\s+(.+)$'))
    if ($projectHeadings.Count -eq 0) {
        $warnings.Add('No business project is registered.')
    }
    foreach ($heading in $projectHeadings) {
        $nextHeading = $registryText.IndexOf("`n## ", $heading.Index + $heading.Length)
        if ($nextHeading -lt 0) { $nextHeading = $registryText.Length }
        $section = $registryText.Substring($heading.Index, $nextHeading - $heading.Index)
        if ($section -notmatch [regex]::Escape([string]([char]0x5F53) + [char]0x524D + [char]0x8BBE + [char]0x5907 + [char]0x8DEF + [char]0x5F84)) {
            $errors.Add("Project is missing its current device path: $($heading.Groups[1].Value.Trim())")
        }
    }
}

$sensitiveNames = @('.env', 'auth', 'data', 'cookies', 'chrome profile')
$trackedFiles = @(& git -C $studioRoot ls-files 2>$null)
if ($LASTEXITCODE -ne 0) {
    $warnings.Add('Unable to read Git tracked files; sensitive path scan was skipped.')
}
else {
    foreach ($trackedFile in $trackedFiles) {
        $normalized = $trackedFile.ToLowerInvariant()
        foreach ($name in $sensitiveNames) {
            if ($normalized -eq $name -or $normalized -like "*/$name" -or $normalized -like "*/$name/*") {
                $errors.Add("Prohibited sensitive path is tracked: $trackedFile")
                break
            }
        }
    }
}

Write-Host 'AI Software Studio self-check'
Write-Host "Root: $studioRoot"
foreach ($warning in $warnings) { Write-Warning $warning }

if ($errors.Count -gt 0) {
    foreach ($message in $errors) { Write-Error $message -ErrorAction Continue }
    Write-Host "Result: FAILED ($($errors.Count) blocking issue(s))"
    exit 1
}

Write-Host 'Result: PASSED'
Write-Host "Registered projects: $($projectHeadings.Count)"
exit 0
