# Shared package/configuration helpers. Compatible with Windows PowerShell 5.1.
Set-StrictMode -Version 2.0

function Invoke-GDProbe([string]$Exe, [string[]]$Arguments) {
    # Windows PowerShell 5.1 can promote native stderr to NativeCommandError.
    # A missing optional interpreter/module is a probe result, not a setup failure.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $Exe @Arguments 2>$null)
        $code = $LASTEXITCODE
    }
    catch { $output = @(); $code = 1 }
    finally { $ErrorActionPreference = $previousPreference }
    return [pscustomobject]@{exitCode=$code;output=($output -join "`n")}
}

function Resolve-GDEnvironment([string]$Name) {
    # Keep printed guides and saved settings compatible with the sharing names.
    switch ($Name) {
        'esp32dev' { return 'esp32dev-sharing' }
        'esp32dev-rgb' { return 'esp32dev-sharing-rgb' }
        'esp32dev-sharing' { return 'esp32dev-sharing' }
        'esp32dev-sharing-rgb' { return 'esp32dev-sharing-rgb' }
        default { throw 'Environment mesti esp32dev-sharing (LED biasa) atau esp32dev-sharing-rgb (RGB).' }
    }
}

function Assert-GDEnvironment([string]$Name) {
    Resolve-GDEnvironment $Name | Out-Null
}

function Assert-GDPort([string]$Port) {
    if ($Port -and $Port -notmatch '^COM[1-9][0-9]*$') {
        throw 'Port mesti nombor COM Windows, contohnya COM5. Guna -Action Ports.'
    }
}

function Get-GDPackagePath([string]$Root, [string]$Relative) {
    if (-not $Relative -or $Relative -match '(^/|\\|:|(^|/)\.\.(/|$))') {
        throw "Laluan pakej tidak sah: $Relative"
    }
    $base = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $path = [IO.Path]::GetFullPath((Join-Path $base $Relative))
    if (-not $path.StartsWith($base + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Laluan di luar pakej: $Relative"
    }
    return $path
}

function Assert-GDNoLinks([string]$Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            if ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Laluan symbolic link/junction tidak digunakan: $current. Pilih folder biasa."
            }
        }
        $current = [IO.Path]::GetDirectoryName($current)
    }
}

function Write-GDAtomicText([string]$Path, [string]$Text) {
    Assert-GDNoLinks $Path
    $temp = Join-Path ([IO.Path]::GetDirectoryName($Path)) ('.geodecoder-copy-' + [guid]::NewGuid().ToString('N') + '.tmp')
    [IO.File]::WriteAllText($temp, $Text, (New-Object Text.UTF8Encoding($false)))
    if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($temp, $Path, [System.Management.Automation.Language.NullString]::Value) }
    else { [IO.File]::Move($temp, $Path) }
}

function Get-GDTextHash([string]$Text) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)))).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function Get-GDManifest([string]$Root) {
    $manifest = Get-Content -Encoding UTF8 -LiteralPath (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json
    if ($manifest.packageId -ne 'GeoDecoder-sharing' -or $manifest.schemaVersion -ne 1) {
        throw 'Ini bukan pakej GeoDecoder sharing yang disokong.'
    }
    $seen = @{}
    foreach ($entry in $manifest.files) {
        if ($seen.ContainsKey($entry.path)) { throw "Fail pendua: $($entry.path)" }
        $seen[$entry.path] = $true
        $file = Get-GDPackagePath -Root $Root -Relative $entry.path
        Assert-GDNoLinks $file
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Fail pakej tiada: $($entry.path). Extract All semula daripada ZIP asal." }
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256) {
            throw "Fail pakej berubah/rosak: $($entry.path). Gunakan ZIP asal yang lengkap."
        }
    }
    return $manifest
}

function Install-GDPackage([string]$Source, [string]$Destination) {
    $Source = [IO.Path]::GetFullPath($Source).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $Destination = [IO.Path]::GetFullPath($Destination).TrimEnd([IO.Path]::DirectorySeparatorChar)
    $manifest = Get-GDManifest $Source
    Assert-GDNoLinks $Destination
    if (Test-Path -LiteralPath (Join-Path $Destination '.git')) {
        throw 'Destinasi ialah folder Git. Pilih folder ZIP berasingan melalui -Destination; jangan gunakan projek peribadi/main.'
    }
    if ($Source -eq $Destination) { return $manifest }
    if (Test-Path -LiteralPath $Destination) {
        $items = @(Get-ChildItem -LiteralPath $Destination -Force)
        $identityExists = Test-Path -LiteralPath (Join-Path $Destination 'package.json')
        $otherItems = @($items | Where-Object { $_.Name -notmatch '^\.geodecoder-copy-[0-9a-f]{32}\.tmp$' })
        if ($otherItems.Count -and -not $identityExists) {
            throw 'Destinasi sudah mengandungi fail bukan pakej ini. Pilih folder kosong melalui -Destination.'
        }
        if ($identityExists) {
            $old = Get-Content -Encoding UTF8 -LiteralPath (Join-Path $Destination 'package.json') -Raw | ConvertFrom-Json
            if ($old.packageId -ne 'GeoDecoder-sharing' -or $old.sourceSha -ne $manifest.sourceSha) {
                throw 'Destinasi mempunyai pakej/sumber berbeza. Gunakan folder baharu; fail asal tidak ditindih.'
            }
        }
    }
    # Preflight ALL files before copying anything. Local edits are never overwritten.
    # Identity goes first so a partial copy can be resumed. Final files appear
    # only after a complete same-directory temporary copy has finished.
    $paths = @([pscustomobject]@{path='package.json';sha256=(Get-FileHash (Join-Path $Source 'package.json') -Algorithm SHA256).Hash}) + @($manifest.files)
    foreach ($entry in $paths) {
        $target = Get-GDPackagePath -Root $Destination -Relative $entry.path
        Assert-GDNoLinks $target
        if (Test-Path -LiteralPath $target) {
            if (-not (Test-Path -LiteralPath $target -PathType Leaf) -or (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $entry.sha256) {
                throw "Fail destinasi berbeza: $($entry.path). Pilih -Destination baharu untuk melindungi suntingan anda."
            }
        }
    }
    foreach ($entry in $paths) {
        $target = Get-GDPackagePath -Root $Destination -Relative $entry.path
        if (-not (Test-Path -LiteralPath $target)) {
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
            $temp = Join-Path ([IO.Path]::GetDirectoryName($target)) ('.geodecoder-copy-' + [guid]::NewGuid().ToString('N') + '.tmp')
            Copy-Item -LiteralPath (Join-Path $Source $entry.path) -Destination $temp
            [IO.File]::Move($temp, $target)
        }
    }
    return $manifest
}

function Read-GDState([string]$Root) {
    $path = Join-Path $Root '.geodecoder.local.json'
    Assert-GDNoLinks $path
    if (-not (Test-Path -LiteralPath $path)) { throw 'Jalankan setupGeoDecoder.ps1 dahulu untuk menyediakan PlatformIO dan projek ini.' }
    $state = Get-Content -Encoding UTF8 -LiteralPath $path -Raw | ConvertFrom-Json
    if ($state.packageId -ne 'GeoDecoder-sharing') { throw 'Konfigurasi tempatan bukan milik pakej ini.' }
    Assert-GDEnvironment $state.environment
    Assert-GDPort $state.port
    return $state
}

function Write-GDLocalConfig([string]$Root, [string]$Python, [string]$Environment, [string]$Port) {
    $Environment = Resolve-GDEnvironment $Environment
    Assert-GDPort $Port
    $ini = Join-Path $Root 'platformio.local.ini'
    Assert-GDNoLinks $ini
    $marker = '; GeoDecoder installer managed - guna geodecoder.ps1 -Action Configure'
    if ((Test-Path -LiteralPath $ini) -and -not (Get-Content -Encoding UTF8 -LiteralPath $ini -Raw).StartsWith($marker)) {
        throw 'platformio.local.ini disunting secara manual. Simpan/namakan semula fail itu dahulu untuk menggunakan Configure; fail tidak ditindih.'
    }
    $body = "$marker`r`n[platformio]`r`ndefault_envs = $Environment`r`n"
    if ($Port) { $body += "`r`n[env]`r`nupload_port = $Port`r`nmonitor_port = $Port`r`n" }
    $previousHash = ''
    if (Test-Path -LiteralPath $ini) {
        $previousHash = (Get-FileHash -LiteralPath $ini -Algorithm SHA256).Hash.ToLowerInvariant()
        $allowed = @(Get-GDTextHash $body)
        if (Test-Path -LiteralPath (Join-Path $Root '.geodecoder.local.json')) {
            $old = Read-GDState $Root
            $allowed = @()
            foreach ($key in @('managedIniSha256','previousIniSha256')) {
                if ($old.PSObject.Properties[$key]) { $allowed += $old.$key }
            }
        }
        if ($previousHash -notin $allowed) { throw 'platformio.local.ini telah disunting. Simpan/namakan semula fail itu sebelum Configure; perubahan anda tidak ditindih.' }
    }
    $state = [ordered]@{packageId='GeoDecoder-sharing';pioPython=$Python;environment=$Environment;port=$Port;managedIniSha256=(Get-GDTextHash $body);previousIniSha256=$previousHash}
    # Store both accepted INI hashes before replacing the INI. If interrupted
    # between these atomic writes, the next run still recognizes the old INI.
    Write-GDAtomicText -Path (Join-Path $Root '.geodecoder.local.json') -Text ($state | ConvertTo-Json)
    Write-GDAtomicText -Path $ini -Text $body
    return [pscustomobject]$state
}

function Repair-GDPip([string]$Python) {
    $probe = Invoke-GDProbe -Exe $Python -Arguments @('-m','pip','--version')
    if ($probe.exitCode -ne 0) {
        Write-Host 'Lengkapkan pip dalam virtualenv GeoDecoder yang terganggu...'
        & $Python -m ensurepip --upgrade
        if ($LASTEXITCODE -ne 0) { throw 'Pemulihan pip gagal. Semak pemasangan Python dan ulang setup dengan Internet tersedia.' }
    }
}

function Invoke-GDPio($State, [string[]]$Arguments) {
    if (-not (Test-Path -LiteralPath $State.pioPython -PathType Leaf)) { throw 'Python PlatformIO tiada. Jalankan setupGeoDecoder.ps1 semula.' }
    & $State.pioPython -m platformio @Arguments
    if ($LASTEXITCODE -ne 0) { throw "PlatformIO gagal (kod $LASTEXITCODE). Semak mesej di atas; pastikan Internet/COM tersedia, kemudian ulang arahan yang sama." }
}

function Get-GDDevices($State) {
    $raw = & $State.pioPython -m platformio device list --json-output
    if ($LASTEXITCODE -ne 0) { throw 'Tidak dapat membaca port. Jalankan setupGeoDecoder.ps1 semula dan semak driver USB-UART.' }
    return @((($raw -join "`n") | ConvertFrom-Json))
}

function Select-GDPort([object[]]$Devices, [string]$Requested = '', [switch]$NoPrompt) {
    Assert-GDPort $Requested
    if ($Requested) {
        if (-not @($Devices | Where-Object { $_.port -eq $Requested }).Count) {
            Write-Host "$Requested belum dikesan. Pilihan disimpan; sambung USB data dan semak COM sebelum Upload."
        }
        return $Requested
    }
    $usb = @($Devices | Where-Object { $_.port -match '^COM[1-9][0-9]*$' -and $_.hwid -match '(?i)(USB|VID:PID)' })
    if ($usb.Count -eq 1) { Write-Host "Port USB dikesan: $($usb[0].port)"; return $usb[0].port }
    $ports = @($Devices | Where-Object { $_.port -match '^COM[1-9][0-9]*$' })
    if (-not $ports.Count) {
        Write-Host 'ESP32 belum dikesan. Build boleh diteruskan. Sambung USB data, semak Device Manager/driver, kemudian guna -Action Configure.'
        return ''
    }
    if ($NoPrompt) { Write-Host 'Port tiada pilihan USB tunggal. Gunakan -Action Configure -Port COMx selepas menyemak Device Manager.'; return '' }
    for ($i=0; $i -lt $ports.Count; $i++) { Write-Host "$($i+1)) $($ports[$i].port)" }
    $answer = Read-Host 'Pilih nombor port (0/Enter = sambung tanpa board)'
    if (-not $answer -or $answer -eq '0') { return '' }
    $number = 0
    if (-not [int]::TryParse($answer, [ref]$number) -or $number -lt 1 -or $number -gt $ports.Count) { throw 'Pilihan port tidak sah. Ulang Configure.' }
    return $ports[$number-1].port
}
