#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Destination = (Join-Path $env:USERPROFILE 'geodecoder-sharing'),
    [ValidateSet('esp32dev','esp32dev-rgb')][string]$Environment,
    [string]$Port,
    [switch]$NoPrompt,
    [switch]$NoOpen,
    [switch]$BuildBoth
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/common.ps1')

function Invoke-GDNative([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Arahan gagal (kod $LASTEXITCODE): $Exe. Betulkan mesej di atas dan jalankan setup semula." }
}

function Get-GDSignedInstaller([string]$Uri, [string]$File, [string]$Publisher) {
    if (-not (Test-Path -LiteralPath $File)) {
        Write-Host "Muat turun dependency rasmi: $Uri"
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile ($File + '.part') -TimeoutSec 180
            Move-Item -LiteralPath ($File + '.part') -Destination $File -Force
        }
        catch { throw "Muat turun gagal: $Uri. Semak Internet/proxy organisasi dan ulang setup. $($_.Exception.Message)" }
    }
    $signature = Get-AuthenticodeSignature -LiteralPath $File
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate -or $signature.SignerCertificate.Subject -notmatch $Publisher) {
        throw "Tandatangan installer tidak sah: $File. Muat turun semula daripada laman rasmi Python/VS Code sebelum meneruskan."
    }
}

function Find-GDPython {
    $probe = 'import sys,struct,json; assert (3,10)<=sys.version_info[:2]<(3,13) and struct.calcsize(''P'')==8; print(json.dumps(sys.executable))'
    $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($launcher) {
        foreach ($version in @('-3.12','-3.11','-3.10')) {
            $result = Invoke-GDProbe -Exe $launcher.Source -Arguments @($version,'-c',$probe)
            if ($result.exitCode -eq 0 -and $result.output) { return [string]($result.output | ConvertFrom-Json) }
        }
    }
    $candidates = @((Join-Path $env:LOCALAPPDATA 'GeoDecoder/tools/Python312/python.exe'))
    foreach ($version in @('312','311','310')) {
        $candidates += Join-Path $env:LOCALAPPDATA "Programs/Python/Python$version/python.exe"
    }
    $command = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($command -and $command.Source -notlike '*WindowsApps*') { $candidates += $command.Source }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            $result = Invoke-GDProbe -Exe $candidate -Arguments @('-c',$probe)
            if ($result.exitCode -eq 0 -and $result.output) { return [string]($result.output | ConvertFrom-Json) }
        }
    }
    return ''
}

function Find-GDCode {
    $candidates = @((Join-Path $env:LOCALAPPDATA 'Programs/Microsoft VS Code/bin/code.cmd'))
    if ($env:ProgramFiles) { $candidates += Join-Path $env:ProgramFiles 'Microsoft VS Code/bin/code.cmd' }
    $command = Get-Command code.cmd -ErrorAction SilentlyContinue
    if ($command) { $candidates += $command.Source }
    foreach ($candidate in $candidates) { if (Test-Path -LiteralPath $candidate) { return $candidate } }
    return ''
}

try {
    if ([Environment]::OSVersion.Platform -ne 'Win32NT' -or -not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') {
        throw 'Installer ini untuk Windows 10/11 x64 dengan PowerShell 5.1 atau lebih baharu. Board sasaran: ESP32 klasik/WROOM-32; ARM/C3/S3 bukan sasaran pakej ini.'
    }
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    Assert-GDPort $Port
    Write-Host '[1/6] Semak pakej dan sediakan folder berasingan...'
    $manifest = Install-GDPackage -Source $PSScriptRoot -Destination $Destination
    $Destination = [IO.Path]::GetFullPath($Destination)
    $previous = $null
    if (Test-Path -LiteralPath (Join-Path $Destination '.geodecoder.local.json')) { $previous = Read-GDState $Destination }
    if (-not $Environment) {
        if ($previous) { $Environment = $previous.environment }
        else {
            $Environment = 'esp32dev-rgb'
            if (-not $NoPrompt) {
                $choice = Read-Host 'Environment: 1=dua RGB empat kaki, 2=dua LED biasa (Enter=1)'
                if ($choice -eq '2') { $Environment = 'esp32dev' }
                elseif ($choice -and $choice -ne '1') { throw 'Pilihan tidak sah. Ulang dengan -Environment esp32dev atau esp32dev-rgb.' }
            }
        }
    }
    if (-not $Port -and $previous) { $Port = $previous.port }
    $tools = Join-Path $env:LOCALAPPDATA 'GeoDecoder/tools'
    $downloads = Join-Path $tools 'downloads'
    New-Item -ItemType Directory -Path $downloads -Force | Out-Null
    $venv = Join-Path $tools ('pio-' + $manifest.platformioCore)
    $pioPython = Join-Path $venv 'Scripts/python.exe'
    Write-Host '[2/6] Sediakan Python dan PlatformIO Core berasingan...'
    $venvReady = $false
    if (Test-Path -LiteralPath $pioPython) {
        $probe = Invoke-GDProbe -Exe $pioPython -Arguments @('-c','import sys; print(sys.executable)')
        $venvReady = $probe.exitCode -eq 0
    }
    if (-not $venvReady) {
        $python = Find-GDPython
        if (-not $python) {
            $installer = Join-Path $downloads 'python-3.12.10-amd64.exe'
            Get-GDSignedInstaller -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -File $installer -Publisher 'Python Software Foundation'
            $pythonDir = Join-Path $tools 'Python312'
            $arguments = "/quiet InstallAllUsers=0 TargetDir=`"$pythonDir`" Include_pip=1 Include_test=0 Include_doc=0 Include_tcltk=0 Include_launcher=0 AssociateFiles=0 Shortcuts=0 PrependPath=0"
            $process = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru
            if ($process.ExitCode -notin @(0,3010)) { throw "Pemasangan Python gagal: $($process.ExitCode). Pasang Python 3.10-3.12 x64 dengan pip dari python.org dan ulang setup." }
            $python = Join-Path $pythonDir 'python.exe'
        }
        Invoke-GDNative -Exe $python -Arguments @('-m','venv',$venv)
    }
    Repair-GDPip -Python $pioPython
    $coreVersion = Invoke-GDProbe -Exe $pioPython -Arguments @('-c','import importlib.metadata; print(importlib.metadata.version(''platformio''))')
    if ($coreVersion.exitCode -ne 0 -or $coreVersion.output.Trim() -ne $manifest.platformioCore) {
        Invoke-GDNative -Exe $pioPython -Arguments @('-m','pip','install','--disable-pip-version-check',('platformio==' + $manifest.platformioCore))
    }
    Invoke-GDNative -Exe $pioPython -Arguments @('-m','platformio','--version')
    Write-Host '[3/6] Sediakan VS Code dan extension PlatformIO...'
    $code = Find-GDCode
    if (-not $code) {
        $installer = Join-Path $downloads 'VSCodeUserSetup-x64.exe'
        Get-GDSignedInstaller -Uri 'https://update.code.visualstudio.com/latest/win32-x64-user/stable' -File $installer -Publisher 'Microsoft Corporation'
        $process = Start-Process -FilePath $installer -ArgumentList '/VERYSILENT /NORESTART /SP- /MERGETASKS=!runcode /COPILOTCLI=none' -Wait -PassThru
        if ($process.ExitCode -ne 0) { throw "Pemasangan VS Code gagal: $($process.ExitCode). Pasang User Setup x64 dari code.visualstudio.com dan ulang setup." }
        $code = Find-GDCode
        if (-not $code) { throw 'VS Code belum ditemui. Pasang User Setup x64 dan ulang setup.' }
    }
    $extensions = & $code --list-extensions
    if ($LASTEXITCODE -ne 0) { throw 'Tidak dapat menyemak extension VS Code. Tutup proses pemasangan VS Code dan ulang setup.' }
    if ('platformio.platformio-ide' -notin $extensions) { Invoke-GDNative -Exe $code -Arguments @('--install-extension','platformio.platformio-ide') }
    Write-Host '[4/6] Pilih COM dan simpan konfigurasi komputer ini...'
    $state = [pscustomobject]@{pioPython=$pioPython}
    $devices = @(Get-GDDevices $state)
    $Port = Select-GDPort -Devices $devices -Requested $Port -NoPrompt:$NoPrompt
    $state = Write-GDLocalConfig -Root $Destination -Python $pioPython -Environment $Environment -Port $Port
    $workspacePath = Join-Path $Destination 'GeoDecoder.local.code-workspace'
    Assert-GDNoLinks $workspacePath
    $workspace = @{folders=@(@{path='.'});settings=@{}}
    if (Test-Path -LiteralPath $workspacePath) { $workspace = Get-Content -Encoding UTF8 -LiteralPath $workspacePath -Raw | ConvertFrom-Json }
    $settings = @{'platformio-ide.useBuiltinPIOCore'=$false;'platformio-ide.customPATH'=((Join-Path $venv 'Scripts') + ';' + $env:PATH)}
    if ($workspace -is [System.Collections.IDictionary]) { $workspace.settings = $settings }
    else { foreach ($key in $settings.Keys) { $workspace.settings | Add-Member -NotePropertyName $key -NotePropertyValue $settings[$key] -Force } }
    Write-GDAtomicText -Path $workspacePath -Text ($workspace | ConvertTo-Json -Depth 12)
    Write-Host '[5/6] Build firmware menggunakan versi platform/library projek...'
    $buildArgs = @('run','--project-dir',$Destination,'-e',$Environment)
    if ($BuildBoth) { $other = 'esp32dev'; if ($Environment -eq $other) { $other = 'esp32dev-rgb' }; $buildArgs += @('-e',$other) }
    Invoke-GDPio -State $state -Arguments $buildArgs
    Write-Host '[6/6] Projek sedia. Build berjaya; Upload belum dilakukan.'
    Write-Host "Firmware v$($manifest.firmwareVersion) | $Environment | $Destination"
    Write-Host 'VS Code: Terminal > Run Task > GeoDecoder: Build / Upload / Monitor / Configure.'
    Write-Host 'Fizikal: ikut SAMBUNGAN.md; sambung USB data; pilih COM; jalankan Upload; BOOT jika diperlukan.'
    if (Test-Path -LiteralPath (Join-Path $Destination 'tutorial/GeoDecoder_Panduan_A-Z.pdf')) {
        Write-Host 'Tutorial A-Z: tutorial/GeoDecoder_Panduan_A-Z.pdf; cara bermain murid: tutorial/GeoDecoder_Cara_Bermain_Murid.pdf.'
    }
    else { Write-Host 'Rujuk README.md untuk panduan pemasangan, sambungan dan permainan.' }
    if (-not $NoOpen) {
        # Open through the native executable: a valid R&D path must not pass
        # through CMD's interpretation of metacharacters in code.cmd.
        $codeExe = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($code)) '../Code.exe'))
        if (-not (Test-Path -LiteralPath $codeExe)) { throw "Code.exe belum ditemui. Buka workspace ini secara manual: $workspacePath" }
        Start-Process -FilePath $codeExe -ArgumentList ('--new-window "' + $workspacePath + '"') | Out-Null
    }
}
catch {
    [Console]::Error.WriteLine("GeoDecoder setup: $($_.Exception.Message)")
    exit 1
}
