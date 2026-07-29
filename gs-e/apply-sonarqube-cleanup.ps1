# SonarQube no-Git cleanup patch for Mini Games Extension
# Put this file in your extension root folder (the folder that contains js\games), then run:
# powershell -ExecutionPolicy Bypass -File .\apply-sonarqube-cleanup.ps1

$ErrorActionPreference = "Stop"

$replacements = @(
  @{ File = "js\games\blackjack.js"; Old = "return parseInt(card.r);"; New = "return Number.parseInt(card.r, 10);" },
  @{ File = "js\games\blackjack.js"; Old = "placeBet(parseInt(b.dataset.amt))"; New = "placeBet(Number.parseInt(b.dataset.amt, 10))" },
  @{ File = "js\games\chess.js"; Old = "parseInt(ch)"; New = "Number.parseInt(ch, 10)" },
  @{ File = "js\games\chess.js"; Old = "8 - parseInt(sq[1]), sq.charCodeAt(0) - 97"; New = "8 - Number.parseInt(sq[1], 10), sq.codePointAt(0) - 97" },
  @{ File = "js\games\connect4.js"; Old = "cursor = parseInt(cell.dataset.c);"; New = "cursor = Number.parseInt(cell.dataset.c, 10);" },
  @{ File = "js\games\marblerun.js"; Old = "selected = parseInt(card.dataset.id, 10);"; New = "selected = Number.parseInt(card.dataset.id, 10);" },
  @{ File = "js\games\marblerun.js"; Old = "wager = parseInt(btn.dataset.wager, 10);"; New = "wager = Number.parseInt(btn.dataset.wager, 10);" },
  @{ File = "js\games\picpoker.js"; Old = "toggleHold(parseInt(el.dataset.idx))"; New = "toggleHold(Number.parseInt(el.dataset.idx, 10))" }
)

foreach ($r in $replacements) {
  if (!(Test-Path $r.File)) {
    Write-Host "Missing file:" $r.File -ForegroundColor Red
    exit 1
  }

  $content = Get-Content $r.File -Raw
  if ($content.Contains($r.New)) {
    Write-Host "Already patched:" $r.File -ForegroundColor Yellow
    continue
  }
  if (!$content.Contains($r.Old)) {
    Write-Host "Could not find expected text in:" $r.File -ForegroundColor Red
    Write-Host "Expected:" $r.Old
    exit 1
  }

  $content = $content.Replace($r.Old, $r.New)
  Set-Content -Path $r.File -Value $content -Encoding UTF8
  Write-Host "Patched:" $r.File -ForegroundColor Green
}

Write-Host "Done. Reload the extension and rerun SonarQube." -ForegroundColor Green
