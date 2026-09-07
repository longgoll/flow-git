Add-Type -AssemblyName System.Drawing
$srcDir = "website\assets"
$outDir = "website\assets\store"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$files = @(
  "flowgit_hero.png",
  "flowgit_diff_split.png",
  "flowgit_conflicts.png",
  "flowgit_timemachine.png",
  "flowgit_trash.png",
  "flowgit_palette.png"
)

foreach ($f in $files) {
  $srcPath = Join-Path $srcDir $f
  if (Test-Path $srcPath) {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath))
    $bmp = New-Object System.Drawing.Bitmap 1920, 1080
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graph.DrawImage($img, 0, 0, 1920, 1080)
    $outPath = Join-Path $outDir $f
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graph.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Generated 1920x1080: $f"
  }
}
