[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$PackageRoot)
$ErrorActionPreference = 'Stop'
$PackageRoot = [IO.Path]::GetFullPath($PackageRoot)
foreach ($file in Get-ChildItem -LiteralPath $PackageRoot -Filter *.ps1 -Recurse) {
    $tokens = $null
    $parseErrors = $null
    [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$parseErrors) | Out-Null
    if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
}
. (Join-Path $PackageRoot 'scripts/common.ps1')
$manifest = Get-GDManifest $PackageRoot
foreach ($alias in @('esp32dev','esp32dev-rgb','esp32dev-sharing','esp32dev-sharing-rgb')) {
    if ((Resolve-GDEnvironment $alias) -ne 'esp32dev-rgb') { throw "Wrong canonical environment: $alias" }
}
$testFile = Join-Path $PackageRoot 'COMMANDS.md'
$original = [IO.File]::ReadAllBytes($testFile)
try {
    [IO.File]::AppendAllText($testFile, 'tampered')
    $rejected = $false
    try { Get-GDManifest $PackageRoot | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'Manifest accepted a changed package file.' }
}
finally { [IO.File]::WriteAllBytes($testFile, $original) }
Write-Host "PASS: PowerShell syntax, $($manifest.files.Count) package hashes, four aliases and tamper rejection."
