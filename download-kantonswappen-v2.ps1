$ErrorActionPreference = "Stop"
$dest = Join-Path (Get-Location) "assets\cantons"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$files = @{
  "ag" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Aargau%20matt.svg"
  "ai" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Appenzell%20Innerrhoden%20matt.svg"
  "ar" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Appenzell%20Ausserrhoden%20matt.svg"
  "be" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Bern%20matt.svg"
  "bl" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Basel-Landschaft%20matt.svg"
  "bs" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Basel-Stadt%20matt.svg"
  "fr" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Freiburg%20matt.svg"
  "ge" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Genf%20matt.svg"
  "gl" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Glarus%20matt.svg"
  "gr" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Graub%C3%BCnden%20matt.svg"
  "ju" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Jura%20matt.svg"
  "lu" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Luzern%20matt.svg"
  "ne" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Neuenburg%20matt.svg"
  "nw" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Nidwalden%20matt.svg"
  "ow" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Obwalden%20matt.svg"
  "sg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20St.%20Gallen%20matt.svg"
  "sh" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Schaffhausen%20matt.svg"
  "so" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Solothurn%20matt.svg"
  "sz" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Schwyz%20matt.svg"
  "tg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Thurgau%20matt.svg"
  "ti" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Tessin%20matt.svg"
  "ur" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Uri%20matt.svg"
  "vd" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Waadt%20matt.svg"
  "vs" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Wallis%20matt.svg"
  "zg" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Zug%20matt.svg"
  "zh" = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Wappen%20Z%C3%BCrich%20matt.svg"
}

foreach ($code in ($files.Keys | Sort-Object)) {
  $target = Join-Path $dest ($code + ".svg")
  if (Test-Path $target) {
    Write-Host "Schon vorhanden: $code.svg"
    continue
  }

  $done = $false
  for ($attempt = 1; $attempt -le 5 -and -not $done; $attempt++) {
    try {
      Write-Host "Lade $code.svg (Versuch $attempt) ..."
      Invoke-WebRequest -Uri $files[$code] -OutFile $target -Headers @{"User-Agent"="Pensionierungsplanung/1.0 (private asset setup)"}
      $done = $true
      Start-Sleep -Seconds 5
    } catch {
      if (Test-Path $target) { Remove-Item $target -Force -ErrorAction SilentlyContinue }
      if ($attempt -eq 5) { throw }
      $wait = 20 * $attempt
      Write-Host "Download blockiert/fehlgeschlagen. Warte $wait Sekunden ..." -ForegroundColor Yellow
      Start-Sleep -Seconds $wait
    }
  }
}

$count = (Get-ChildItem $dest -Filter *.svg -File).Count
Write-Host ""
if ($count -eq 26) {
  Write-Host "Fertig: 26/26 Kantonswappen unter assets\cantons" -ForegroundColor Green
} else {
  Write-Host "Aktuell vorhanden: $count/26. Skript später nochmals starten." -ForegroundColor Yellow
}