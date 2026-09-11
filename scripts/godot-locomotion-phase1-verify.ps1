param(
    [string]$Root = 'C:\Users\pftgu\Documents\avlobytest'
)

$ErrorActionPreference = 'Stop'

function Write-Section([string]$Title) {
    Write-Host "`n=== $Title ==="
}

function Find-Matches([string[]]$Patterns) {
    if (-not (Test-Path $Root)) { return @() }
    Get-ChildItem $Root -Recurse -File -Include *.gd,*.tscn,*.tres,*.res,*.cfg |
        Where-Object { $_.FullName -notmatch '\\(\.godot|build|addons)\\' } |
        Select-String -Pattern $Patterns -CaseSensitive:$false |
        Select-Object Path, LineNumber, Line
}

Write-Section 'PHASE 1 GODOT LOCOMOTION VERIFICATION'
Write-Host "ROOT: $Root"
if (-not (Test-Path $Root)) {
    Write-Host 'FIRST FAILURE: GODOT_ROOT_NOT_FOUND'
    exit 2
}

Push-Location $Root
try {
    Write-Section 'GIT STATE'
    if (Test-Path (Join-Path $Root '.git')) {
        Write-Host ('BRANCH: ' + ((git branch --show-current) -join ''))
        Write-Host ('COMMIT: ' + ((git rev-parse HEAD) -join ''))
        Write-Host 'WORKTREE:'
        git status --short
        Write-Host 'REMOTES:'
        $remotes = @(git remote -v)
        if ($remotes.Count -eq 0) { Write-Host 'NO_REMOTE' } else { $remotes | ForEach-Object { Write-Host $_ } }
    } else {
        Write-Host 'NO_GIT_METADATA'
    }

    Write-Section 'REQUIRED FILES'
    $required = @(
        'Main.tscn',
        'player.gd',
        'scripts\pocketpt\pocketpt_avatar_loader.gd',
        'scripts\pocketpt\pocketpt_phone_flow.gd',
        'scripts\pocketpt\pocketpt_game_client.gd'
    )
    foreach ($rel in $required) {
        $path = Join-Path $Root $rel
        Write-Host (('{0,-52} {1}' -f $rel, ($(if (Test-Path $path) { 'PASS' } else { 'FAIL' }))))
    }

    Write-Section 'LOCOMOTION STATE MODEL REFERENCES'
    $stateMatches = @(Find-Matches @('ACTION_OVERRIDE','LocomotionState','IDLE','WALK','RUN','horizontal_velocity','run_speed_threshold','idle_speed_epsilon'))
    if ($stateMatches.Count -eq 0) {
        Write-Host 'FIRST FAILURE: LOCOMOTION_STATE_MODEL_NOT_FOUND'
    } else {
        $stateMatches | Format-Table -AutoSize
    }

    Write-Section 'ANIMATION PLAYBACK REFERENCES'
    $animMatches = @(Find-Matches @('AnimationPlayer','AnimationTree','play\(','current_animation','is_playing','AnimationLibrary'))
    if ($animMatches.Count -eq 0) {
        Write-Host 'FIRST FAILURE: ANIMATION_PLAYBACK_REFERENCE_NOT_FOUND'
    } else {
        $animMatches | Format-Table -AutoSize
    }

    Write-Section 'PHYSICAL MOVEMENT REFERENCES'
    $movementMatches = @(Find-Matches @('move_and_slide','velocity','NavigationAgent3D','map_get_closest_point','_route_target','GO_TO_MAT'))
    if ($movementMatches.Count -eq 0) {
        Write-Host 'FIRST FAILURE: PHYSICAL_MOVEMENT_AUTHORITY_NOT_FOUND'
    } else {
        $movementMatches | Format-Table -AutoSize
    }

    Write-Section 'ROOT MOTION RISK SEARCH'
    $rootMotionMatches = @(Find-Matches @('root_motion','root motion','get_root_motion','root_motion_track'))
    if ($rootMotionMatches.Count -eq 0) {
        Write-Host 'ROOT_MOTION_REFERENCES: NONE_FOUND'
    } else {
        $rootMotionMatches | Format-Table -AutoSize
    }

    Write-Section 'CONSOLIDATED DEBUG CONTRACT'
    $debugMatches = @(Find-Matches @('FIRST FAILURE','LOCOMOTION STATE','HORIZONTAL SPEED','REQUESTED CLIP','RESOLVED CLIP','ANIMATION PLAYING','GO_TO_MAT ACTIVE'))
    if ($debugMatches.Count -eq 0) {
        Write-Host 'FIRST FAILURE: LOCOMOTION_DEBUG_CONTRACT_NOT_FOUND'
    } else {
        $debugMatches | Format-Table -AutoSize
    }

    Write-Section 'HUMAN RUNTIME ACCEPTANCE'
    @(
        '[ ] personalized avatar loads',
        '[ ] standing visibly plays Idle',
        '[ ] forward visibly plays Walk',
        '[ ] backward visibly plays Walk',
        '[ ] left/right visibly plays Walk',
        '[ ] GO_TO_MAT physically moves + Walk',
        '[ ] arrival returns to Idle',
        '[ ] STOP returns to Idle',
        '[ ] explicit run visibly plays Run',
        '[ ] Run -> Walk transition works',
        '[ ] Run -> Idle transition works',
        '[ ] no animation-driven world translation/double displacement',
        '[ ] mat arrival remains physically correct'
    ) | ForEach-Object { Write-Host $_ }

    Write-Section 'FIRST-FAILURE PIPELINE'
    Write-Host 'LOCOMOTION_INPUT -> VELOCITY_RESOLVED -> PERSONAL_AVATAR_RESOLVED -> MAPPING_PROFILE_RESOLVED -> ANIMATION_PLAYER_RESOLVED -> CLIP_RESOLVED -> RETARGET_BOUND -> CLIP_PLAY_REQUESTED -> CLIP_PLAYING -> CHARACTER_MOVED'
    Write-Host 'Use the earliest failing runtime boundary from the consolidated in-game debug panel as authority.'
}
finally {
    Pop-Location
}
