param(
    [string]$Root = 'C:\Users\pftgu\Documents\avlobytest'
)

$ErrorActionPreference = 'Continue'

function Section([string]$title) {
    Write-Host "`n=== $title ==="
}

if (-not (Test-Path -LiteralPath $Root)) {
    Write-Host "FIRST FAILURE: GODOT_ROOT_MISSING"
    Write-Host "ROOT: $Root"
    exit 1
}

Set-Location -LiteralPath $Root

Section 'REPOSITORY STATE'
Write-Host "ROOT: $Root"
Write-Host 'BRANCH:'
git branch --show-current
Write-Host 'COMMIT:'
git log -1 --oneline
Write-Host 'WORKTREE:'
git status --short
Write-Host 'REMOTES:'
$remotes = @(git remote -v)
if ($remotes.Count -eq 0) { Write-Host 'NO_REMOTE' } else { $remotes | ForEach-Object { Write-Host $_ } }

Section 'MUFASA SOURCES'
$patterns = @(
    'Mufasa_Idle_01',
    'Mufasa_Idle_02',
    'Mufasa_Idle_03',
    'Mufasa_Walk',
    'Mufasa_Run',
    'MUFASA_YIELD',
    'NavigationAgent3D',
    'map_get_closest_point',
    'AnimationPlayer',
    'move_and_slide',
    'circle',
    'chase',
    'yield'
)

Get-ChildItem $Root -Recurse -File -Include *.gd,*.tscn,*.tres,*.res,*.import |
    Where-Object { $_.FullName -notmatch '\\(\.godot|build|addons)\\' } |
    Select-String -Pattern $patterns -CaseSensitive:$false |
    Select-Object Path,LineNumber,Line |
    Format-Table -AutoSize

Section 'MUFASA ASSETS'
Get-ChildItem $Root -Recurse -File -Include *.glb,*.gltf,*.fbx,*.blend,*.anim,*.tres |
    Where-Object { $_.FullName -notmatch '\\(\.godot|build|addons)\\' -and $_.Name -match 'mufasa|lion' } |
    Select-Object FullName,Length |
    Format-Table -AutoSize

Section 'REQUIRED RUNTIME FIRST-FAILURE CHAIN'
@(
    'NPC_STATE',
    'MUFASA_NODE_RESOLVED',
    'ANIMATION_PLAYER_RESOLVED',
    'CLIP_RESOLVED',
    'PLAYER_TARGET_RESOLVED',
    'NAV_TARGET_RESOLVED',
    'PATH_AVAILABLE',
    'CLIP_PLAY_REQUESTED',
    'CLIP_PLAYING',
    'NPC_MOVED'
) | ForEach-Object { Write-Host $_ }

Section 'YIELD ACCEPTANCE'
Write-Host 'MUFASA_YIELD received -> chase target cleared -> velocity reduced to zero -> Run exits -> face player'

Section 'CIRCLE ACCEPTANCE'
Write-Host 'center = CURRENT personalized-player position'
Write-Host 'waypoints = dynamic ring around current player, projected to reachable NavMesh'
Write-Host 'animation = verified Mufasa_Walk'
Write-Host 'world translation = NPC CharacterBody/NavigationAgent authority, not root motion'

Section 'PROTECTED REGRESSIONS'
Write-Host 'Player locomotion authority unchanged'
Write-Host 'GO_TO_MAT projection/arrival unchanged'
Write-Host 'Personalized-avatar mapping unchanged'
Write-Host 'MoveNet / Push-Up / Thriller / Motion Lab unchanged'

Section 'HUMAN ACCEPTANCE'
Write-Host '[ ] Idle visibly plays'
Write-Host '[ ] Player entry resolves personalized player'
Write-Host '[ ] Alert faces player'
Write-Host '[ ] Chase uses Run and physically approaches player'
Write-Host '[ ] MUFASA_YIELD stops pursuit and exits Run'
Write-Host '[ ] Circle uses Walk around CURRENT player position'
Write-Host '[ ] Player Walk/Run still passes'
Write-Host '[ ] GO_TO_MAT still passes'
