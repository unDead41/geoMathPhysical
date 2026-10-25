#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('Build','Upload','Monitor','Ports','Configure')][string]$Action = 'Build',
    [ValidateSet('esp32dev','esp32dev-rgb')][string]$Environment,
    [string]$Port,
    [switch]$NoPrompt
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/common.ps1')
try {
    $state = Read-GDState $PSScriptRoot
    if (-not $Environment) { $Environment = $state.environment }
    Assert-GDPort $Port
    if ($Action -eq 'Configure') {
        if (-not $PSBoundParameters.ContainsKey('Environment') -and -not $NoPrompt) {
            $answer = Read-Host "Environment: 1=RGB, 2=LED biasa (Enter kekalkan $Environment)"
            if ($answer -eq '1') { $Environment = 'esp32dev-rgb' }
            elseif ($answer -eq '2') { $Environment = 'esp32dev' }
            elseif ($answer) { throw 'Pilih 1, 2 atau Enter.' }
        }
        $devices = @(Get-GDDevices $state)
        $Port = Select-GDPort -Devices $devices -Requested $Port -NoPrompt:$NoPrompt
        Write-GDLocalConfig -Root $PSScriptRoot -Python $state.pioPython -Environment $Environment -Port $Port | Out-Null
        Write-Host "Disimpan: $Environment | COM: $Port. Muat semula tetingkap VS Code jika menukar environment."
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
