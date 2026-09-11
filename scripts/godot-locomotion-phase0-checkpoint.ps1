param(
  [string]$GodotRoot = 'C:\Users\pftgu\Documents\avlobytest',
  [string]$GodotExe = 'C:\Users\pftgu\Desktop\Godot_v4.5.1-stable_win64.exe'
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
  Write-Host "`n=== $Title ==="
}

function Write-Check([string]$Name, [bool]$Ok, [string]$Detail = '') {
  $status = if ($Ok) { 'PASS' } else { 'FAIL' }
  if ($Detail) {
    Write-Host ("{0,-36} {1,-5} {2}" -f $Name, $status, $Detail)
  } else {
    Write-Host ("{0,-36} {1}" -f $Name, $status)
  }
}

Write-Section 'PHASE 0 SAFETY CHECKPOINT'
Write-Check 'GODOT_ROOT_EXISTS' (Test-Path -LiteralPath $GodotRoot) $GodotRoot
if (-not (Test-Path -LiteralPath $GodotRoot)) {
  Write-Host 'FIRST FAILURE: GODOT_ROOT_EXISTS'
  exit 2
}

Write-Check 'GODOT_EXE_EXISTS' (Test-Path -LiteralPath $GodotExe) $GodotExe

Push-Location $GodotRoot
try {
  Write-Section 'GIT STATE (READ ONLY)'
  $insideGit = $false
  try {
    $insideGit = ((git rev-parse --is-inside-work-tree 2>$null) -eq 'true')
  } catch {
    $insideGit = $false
  }

  Write-Check 'GIT_WORKTREE' $insideGit
  if ($insideGit) {
    Write-Host '--- git status --short ---'
    git status --short
    Write-Host '--- git branch --show-current ---'
    git branch --show-current
    Write-Host '--- git log -1 --oneline ---'
    git log -1 --oneline
    Write-Host '--- git remote -v ---'
    $remotes = @(git remote -v)
    if ($remotes.Count -eq 0) {
      Write-Host 'NO_REMOTE (allowed; do not invent one)'
    } else {
      $remotes | ForEach-Object { Write-Host $_ }
    }
  }

  $protectedBackup = Join-Path $GodotRoot 'export_presets.cfg.before-pocketpt-fix'
  if (Test-Path -LiteralPath $protectedBackup) {
    Write-Host "PROTECTED_BACKUP_PRESENT: $protectedBackup"
    Write-Host 'ACTION: LEAVE UNTRACKED/UNCHANGED'
  } else {
    Write-Host 'PROTECTED_BACKUP_PRESENT: NO'
  }

  Write-Section 'AUTHORITATIVE FILE CHECK'
  $required = @(
    'Main.tscn',
    'player.gd',
    'gym_environment.gd',
    'scripts\pocketpt\pocketpt_phone_flow.gd',
    'scripts\pocketpt\pocketpt_bootstrap.gd',
    'scripts\pocketpt\pocketpt_avatar_loader.gd',
    'scripts\pocketpt\pocketpt_game_client.gd',
    'scripts\pocketpt\pocketpt_bridge_debug.gd',
    'scenes\characters\mufasa_gym.tscn'
  )

  $firstMissing = $null
  foreach ($relative in $required) {
    $full = Join-Path $GodotRoot $relative
    $ok = Test-Path -LiteralPath $full
    Write-Check $relative $ok $full
    if (-not $ok -and -not $firstMissing) {
      $firstMissing = $relative
    }
  }

  Write-Section 'STATIC LOCOMOTION / ANIMATION INVENTORY'
  $sourceFiles = Get-ChildItem $GodotRoot -Recurse -File -Include *.gd,*.tscn,*.tres,*.res,*.import |
    Where-Object { $_.FullName -notmatch '\\(\.godot|build|addons)\\' }

  $patterns = 'AnimationPlayer|AnimationTree|Mufasa_Idle|Mufasa_Walk|Mufasa_Run|idle|walk|run|NavigationAgent3D|velocity|move_and_slide|GO_TO_MAT|CONTROL_INTENT'
  $matches = $sourceFiles |
    Select-String -Pattern $patterns -CaseSensitive:$false |
    Select-Object Path,LineNumber,Line

  if ($matches) {
    $matches | Format-Table -AutoSize -Wrap
  } else {
    Write-Host 'NO_STATIC_MATCHES_FOUND'
  }

  Write-Section 'ANIMATION / MODEL ASSETS'
  $assets = Get-ChildItem $GodotRoot -Recurse -File -Include *.glb,*.gltf,*.fbx,*.blend,*.anim,*.tres |
    Where-Object { $_.FullName -notmatch '\\(\.godot|build|addons)\\' } |
    Select-Object FullName,Length

  if ($assets) {
    $assets | Format-Table -AutoSize
  } else {
    Write-Host 'NO_MODEL_OR_ANIMATION_ASSETS_FOUND'
  }

  Write-Section 'PHASE 0 RESULT'
  if ($firstMissing) {
    Write-Host "FIRST FAILURE: REQUIRED_FILE_MISSING -> $firstMissing"
    Write-Host 'Do not modify locomotion until the authoritative source location is confirmed.'
    exit 3
  }

  Write-Host 'STATIC_CHECKPOINT: PASS'
  Write-Host 'NEXT REQUIRED RUNTIME BOUNDARY:'
  Write-Host 'PERSONAL_AVATAR_MOUNTED -> SKELETON_FOUND -> BONES_INVENTORIED -> ANIMATION_PLAYER_FOUND -> ANIMATION_LIBRARY_FOUND -> CLIPS_INVENTORIED'
  Write-Host 'This script does NOT claim runtime animation playback success.'
  Write-Host 'Instrument pocketpt_avatar_loader.gd after the personalized avatar is mounted and capture exact clip names, durations, loop settings, and FIRST FAILURE.'
}
finally {
  Pop-Location
}
