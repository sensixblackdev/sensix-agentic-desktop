param(
  [string]$Version = (node -p "require('./package.json').version"),
  [string]$LandingDir = 'E:/axion/services/ide-landing'
)
$ErrorActionPreference = 'Stop'
$dist = 'E:/axion/dists/sensix-agentic-desktop'
$installer = Get-ChildItem $dist -Filter "SENSIX Agentic Desktop Setup $Version.exe" | Select-Object -First 1
if (-not $installer) { throw "Installer for version $Version not found in $dist" }
New-Item -ItemType Directory -Force -Path $LandingDir | Out-Null
Copy-Item $installer.FullName (Join-Path $LandingDir "SENSIX-Agentic-Desktop-Setup-$Version.exe") -Force
$json = @{ version=$Version; filename="SENSIX-Agentic-Desktop-Setup-$Version.exe"; generatedAt=(Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
Set-Content -LiteralPath (Join-Path $LandingDir 'release-manifest.json') -Value $json -Encoding UTF8
$cfg = @{ rewrites=@(@{source='/download/latest';destination="/$($installer.Name.Replace(' ','-'))"}); headers=@(@{source="/$($installer.Name.Replace(' ','-'))";headers=@(@{key='Content-Disposition';value="attachment; filename=$($installer.Name.Replace(' ','-'))"},@{key='Cache-Control';value='public, max-age=300'})}) } | ConvertTo-Json -Depth 6
Set-Content -LiteralPath (Join-Path $LandingDir 'vercel.json') -Value $cfg -Encoding UTF8
$line = Get-Content 'D:/WORKSPACE/SECURE/VAULT/tokens/vercel/vercel.env' | Where-Object { $_ -match '^VERCEL_TOKEN=' }
$token = ($line -split '=',2)[1].Trim().Trim('"')
if (-not $token) { throw 'VERCEL_TOKEN missing from Vault' }
pnpm dlx vercel@latest --cwd $LandingDir --prod --yes --token $token
