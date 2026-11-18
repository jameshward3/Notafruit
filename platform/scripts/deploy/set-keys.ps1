# Writes the Supabase Storage S3 key pair into platform/.env.production.local.
# Run it yourself (it asks for the values; the secret is not shown while typing):
#   powershell -ExecutionPolicy Bypass -File scripts\deploy\set-keys.ps1
$ErrorActionPreference = 'Stop'
$file = Join-Path $PSScriptRoot '..\..\.env.production.local' | Resolve-Path
$id = Read-Host 'Paste the Access key ID (32 characters)'
$sec = Read-Host 'Paste the Secret access key (the longer value)' -AsSecureString
$secret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$id = $id.Trim(); $secret = $secret.Trim()
if ($id -eq $secret) { Write-Host 'The two values are identical - copy the SECRET (second field) for the second prompt.' -ForegroundColor Red; exit 1 }
$lines = Get-Content -LiteralPath $file
$lines = $lines | ForEach-Object {
  if ($_ -like 'S3_ACCESS_KEY_ID=*') { "S3_ACCESS_KEY_ID=$id" }
  elseif ($_ -like 'S3_SECRET_ACCESS_KEY=*') { "S3_SECRET_ACCESS_KEY=$secret" }
  else { $_ }
}
[IO.File]::WriteAllLines($file, $lines)
Write-Host ("Saved: key ID {0} characters, secret {1} characters." -f $id.Length, $secret.Length) -ForegroundColor Green
