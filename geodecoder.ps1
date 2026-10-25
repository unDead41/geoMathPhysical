#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('Build','Upload','Monitor','Ports','Configure')][string]$Action = 'Build',
    [ValidateSet('esp32dev-sharing','esp32dev-sharing-rgb','esp32dev','esp32dev-rgb')][string]$Environment,
    [string]$Port,
    [switch]$NoPrompt
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/common.ps1')
try {
    $state = Read-GDState $PSScriptRoot
    if ($state.environment -ne (Resolve-GDEnvironment $state.environment)) {
        $state = Write-GDLocalConfig -Root $PSScriptRoot -Python $state.pioPython -Environment $state.environment -Port $state.port
    }
    if (-not $Environment) { $Environment = $state.environment }
    $Environment = Resolve-GDEnvironment $Environment
    Assert-GDPort $Port
    if ($Action -eq 'Configure') {
        $devices = @(Get-GDDevices $state)
        $Port = Select-GDPort -Devices $devices -Requested $Port -NoPrompt:$NoPrompt
        Write-GDLocalConfig -Root $PSScriptRoot -Python $state.pioPython -Environment $Environment -Port $Port | Out-Null
        Write-Host "Disimpan: satu build RGB | COM: $Port."
    }
    elseif ($Action -eq 'Ports') {
        Invoke-GDPio -State $state -Arguments @('device','list')
    }
    elseif ($Action -eq 'Build') {
        Invoke-GDPio -State $state -Arguments @('run','--project-dir',$PSScriptRoot,'-e',$Environment)
    }
    else {
        if (-not $Port) { $Port = $state.port }
        if (-not $Port) { throw 'COM belum dipilih. Sambung ESP32, kemudian jalankan -Action Configure atau gunakan -Port COM5 (ganti nombor sebenar).' }
        $devices = @(Get-GDDevices $state)
        if (-not @($devices | Where-Object { $_.port -eq $Port }).Count) { throw "$Port tiada. Semak USB data/driver dan jalankan -Action Configure." }
        if ($Action -eq 'Upload') {
            Write-Host "Upload $Environment -> $Port. Tutup Monitor lain. Jika Connecting berulang: tahan BOOT sehingga menulis, kemudian lepas."
            Invoke-GDPio -State $state -Arguments @('run','--project-dir',$PSScriptRoot,'-e',$Environment,'-t','upload','--upload-port',$Port)
        }
        else {
            Write-Host 'Monitor 115200. Taip version kemudian Enter. Ctrl+C untuk keluar.'
            Push-Location $PSScriptRoot
            try { Invoke-GDPio -State $state -Arguments @('device','monitor','-e',$Environment,'--port',$Port) }
            finally { Pop-Location }
        }
    }
}
catch {
    [Console]::Error.WriteLine("GeoDecoder: $($_.Exception.Message)")
    exit 1
}
