param (
    [string]$MsiPath = "",
    [string]$PackageName = $env:MSIX_PACKAGE_NAME,
    [string]$Publisher = $env:MSIX_PUBLISHER,
    [string]$PublisherDisplayName = $env:MSIX_PUBLISHER_DISPLAY_NAME,
    [string]$DisplayName = "FlowGit",
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

# Read version from package.json (Single Source of Truth) and format to X.Y.Z.0
if (-not $Version) {
    $pkgJson = Join-Path $PSScriptRoot "..\package.json"
    if (Test-Path $pkgJson) {
        $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
        $cleanV = $pkg.version.Split('-')[0]
        $parts = [System.Collections.ArrayList]@($cleanV.Split('.'))
        while ($parts.Count -lt 4) { [void]$parts.Add("0") }
        $Version = ($parts[0..3] -join '.')
    } else {
        $Version = "0.1.1.0"
    }
}

# Read from local .env.msix file if present (in .gitignore)
$envFile = Join-Path $PSScriptRoot "..\.env.msix"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim().Trim('"').Trim("'")
            if (-not [string]::IsNullOrEmpty($k)) {
                [Environment]::SetEnvironmentVariable($k, $v, "Process")
            }
        }
    }
    if (-not $PackageName) { $PackageName = $env:MSIX_PACKAGE_NAME }
    if (-not $Publisher) { $Publisher = $env:MSIX_PUBLISHER }
    if (-not $PublisherDisplayName) { $PublisherDisplayName = $env:MSIX_PUBLISHER_DISPLAY_NAME }
}

if (-not $PackageName -or -not $Publisher) {
    throw "Missing identity info! Please pass parameters or define in .env.msix or environment variables (MSIX_PACKAGE_NAME, MSIX_PUBLISHER, MSIX_PUBLISHER_DISPLAY_NAME)"
}

$MakeAppx = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe"
if (-not (Test-Path $MakeAppx)) {
    $found = Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits" -Filter "makeappx.exe" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*x64*" } | Select-Object -First 1
    if ($found) {
        $MakeAppx = $found.FullName
    } else {
        throw "makeappx.exe was not found in Windows Kits!"
    }
}
Write-Host "Using makeappx: $MakeAppx" -ForegroundColor Cyan

$workDir = Join-Path $PSScriptRoot "..\temp_msix_build"
$outDir = Join-Path $PSScriptRoot "..\dist-msix"
$pkgDir = Join-Path $workDir "package"
$assetsDir = Join-Path $pkgDir "Assets"

if (Test-Path $workDir) { Remove-Item -Path $workDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $pkgDir | Out-Null
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# 1. Get MSI file (from parameter or fallback download)
if (-not $MsiPath -or -not (Test-Path $MsiPath)) {
    $downloadMsi = Join-Path $workDir "FlowGit.msi"
    Write-Host "Checking and downloading MSI file v0.1.1 from GitHub..." -ForegroundColor Yellow
    $url = "https://github.com/longgoll/flow-git/releases/download/v0.1.1/FlowGit_0.1.1_x64_en-US.msi"
    try {
        Invoke-WebRequest -Uri $url -OutFile $downloadMsi -Headers @{"User-Agent"="PowerShell"}
        $MsiPath = $downloadMsi
    } catch {
        Write-Host "v0.1.1 not yet on GitHub, trying fallback v0.1.0..." -ForegroundColor DarkYellow
        $urlFallback = "https://github.com/longgoll/flow-git/releases/download/v0.1.0/FlowGit_0.1.0_x64_en-US.msi"
        Invoke-WebRequest -Uri $urlFallback -OutFile $downloadMsi -Headers @{"User-Agent"="PowerShell"}
        $MsiPath = $downloadMsi
    }
}

Write-Host "Extracting MSI file: $MsiPath" -ForegroundColor Cyan
$MsiPathFull = (Resolve-Path $MsiPath).Path
$extractDir = Join-Path $workDir "extracted"
if (-not (Test-Path $extractDir)) {
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
}
$extractDirFull = (Resolve-Path $extractDir).Path

$argList = @('/a', $MsiPathFull, '/qb', "TARGETDIR=$extractDirFull")
Start-Process -FilePath "msiexec.exe" -ArgumentList $argList -Wait -NoNewWindow
Start-Sleep -Seconds 2

# 2. Locate FlowGit.exe executable
$exeFile = Get-ChildItem -Path $extractDir -Filter "FlowGit.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $exeFile) {
    $exeFile = Get-ChildItem -Path $extractDir -Filter "flowgit.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $exeFile) {
    throw "Could not find FlowGit.exe in the extracted MSI package!"
}

$appRootDir = $exeFile.DirectoryName
Write-Host "Application root directory: $appRootDir" -ForegroundColor Green

# Copy all application files to package directory
Copy-Item -Path "$appRootDir\*" -Destination $pkgDir -Recurse -Force

# 3. Prepare Assets
Add-Type -AssemblyName System.Drawing
$iconSrc = Join-Path $PSScriptRoot "..\src-tauri\icons"

Copy-Item -Path (Join-Path $iconSrc "StoreLogo.png") -Destination (Join-Path $assetsDir "StoreLogo.png") -Force
Copy-Item -Path (Join-Path $iconSrc "Square44x44Logo.png") -Destination (Join-Path $assetsDir "Square44x44Logo.png") -Force
Copy-Item -Path (Join-Path $iconSrc "Square150x150Logo.png") -Destination (Join-Path $assetsDir "Square150x150Logo.png") -Force
Copy-Item -Path (Join-Path $iconSrc "Square310x310Logo.png") -Destination (Join-Path $assetsDir "Square310x310Logo.png") -Force

# Create Wide310x150Logo.png
$wideBmp = New-Object System.Drawing.Bitmap 310, 150
$wideGraph = [System.Drawing.Graphics]::FromImage($wideBmp)
$wideGraph.Clear([System.Drawing.Color]::FromArgb(255, 13, 17, 23)) # #0d1117
$icon150 = [System.Drawing.Image]::FromFile((Resolve-Path (Join-Path $iconSrc "Square150x150Logo.png")))
# Draw centered icon (80x80)
$x = [int]((310 - 80) / 2)
$y = [int]((150 - 80) / 2)
$wideGraph.DrawImage($icon150, $x, $y, 80, 80)
$wideBmp.Save((Join-Path $assetsDir "Wide310x150Logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$wideGraph.Dispose()
$wideBmp.Dispose()

# Create SplashScreen.png (620x300)
$splashBmp = New-Object System.Drawing.Bitmap 620, 300
$splashGraph = [System.Drawing.Graphics]::FromImage($splashBmp)
$splashGraph.Clear([System.Drawing.Color]::FromArgb(255, 13, 17, 23))
$xSplash = [int]((620 - 150) / 2)
$ySplash = [int]((300 - 150) / 2)
$splashGraph.DrawImage($icon150, $xSplash, $ySplash, 150, 150)
$splashBmp.Save((Join-Path $assetsDir "SplashScreen.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$splashGraph.Dispose()
$splashBmp.Dispose()
$icon150.Dispose()

# 4. Create AppxManifest.xml
$manifestContent = @"
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">

  <Identity
    Name="$PackageName"
    Publisher="$Publisher"
    Version="$Version"
    ProcessorArchitecture="x64" />

  <Properties>
    <DisplayName>$DisplayName</DisplayName>
    <PublisherDisplayName>$PublisherDisplayName</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>

  <Resources>
    <Resource Language="en-us" />
  </Resources>

  <Applications>
    <Application Id="FlowGit"
      Executable="$($exeFile.Name)"
      EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="$DisplayName"
        Description="Next-Gen Visual Git Client built with Rust, Tauri v2 and Svelte 5."
        BackgroundColor="#0d1117"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png">
        <uap:DefaultTile Wide310x150Logo="Assets\Wide310x150Logo.png" Square310x310Logo="Assets\Square310x310Logo.png">
          <uap:ShowNameOnTiles>
            <uap:ShowOn Tile="square150x150Logo" />
            <uap:ShowOn Tile="wide310x150Logo" />
          </uap:ShowNameOnTiles>
        </uap:DefaultTile>
        <uap:SplashScreen Image="Assets\SplashScreen.png" />
      </uap:VisualElements>
    </Application>
  </Applications>

  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
"@

$manifestPath = Join-Path $pkgDir "AppxManifest.xml"
[System.IO.File]::WriteAllText($manifestPath, $manifestContent, [System.Text.Encoding]::UTF8)
Write-Host "Created AppxManifest.xml" -ForegroundColor Green

# 5. Package using makeappx.exe
$semver = if ($Version) { ($Version.Split('.')[0..2] -join '.') } else { "latest" }
$finalMsix = Join-Path $outDir "FlowGit_${semver}.msix"
if (Test-Path $finalMsix) { Remove-Item -Path $finalMsix -Force }

Write-Host "Packaging into MSIX..." -ForegroundColor Cyan
& "$MakeAppx" pack /d "$pkgDir" /p "$finalMsix" /nv /o

if (Test-Path $finalMsix) {
    $sizeMb = [Math]::Round(((Get-Item $finalMsix).Length / 1MB), 2)
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "SUCCESS! MSIX package created successfully:" -ForegroundColor Green
    Write-Host "   Path: $finalMsix" -ForegroundColor Yellow
    Write-Host "   Size: $sizeMb MB" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Green
} else {
    throw "Packaging MSIX failed!"
}
