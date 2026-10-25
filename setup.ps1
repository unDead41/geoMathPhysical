#requires -Version 5.1
# Compatibility entry for existing printed guides; primary installer below.
[CmdletBinding()]
param(
    [string]$Destination,
    [ValidateSet('esp32dev-sharing','esp32dev-sharing-rgb','esp32dev','esp32dev-rgb')][string]$Environment,
    [string]$Port,
    [switch]$NoPrompt,
    [switch]$NoOpen,
    [switch]$BuildBoth
)
& (Join-Path $PSScriptRoot 'setupGeoDecoder.ps1') @PSBoundParameters
if (-not $?) { exit 1 }
exit 0
