# Git Worktree Setup for Debugging

## Overview

A git worktree has been created to safely debug Tailwind CSS issues without affecting the main development branch.

## Worktree Structure

```
/Users/hmziq/Documents/opensource/hmziq.rs (main repo)
├── Branch: redesign-expertise-section
└── Working files with uncommitted changes

/Users/hmziq/Documents/opensource/debug-worktrees/tailwind-debug (debug worktree)
├── Branch: debug-tailwind-css
└── Clean workspace for CSS debugging
```

## Setup Details

1. **Original Branch**: `redesign-expertise-section`
   - Location: `/Users/hmziq/Documents/opensource/hmziq.rs`
   - Status: Contains uncommitted changes to `components/sections/Skills.tsx`

2. **Debug Branch**: `debug-tailwind-css`
   - Location: `/Users/hmziq/Documents/opensource/debug-worktrees/tailwind-debug`
   - Purpose: Safe environment for CSS configuration experiments

## Commands Used

```bash
# Create new branch for debugging
git checkout -b debug-tailwind-css

# Switch back to original branch
git checkout redesign-expertise-section

# Create worktree directory
mkdir -p ../debug-worktrees

# Create worktree
git worktree add ../debug-worktrees/tailwind-debug debug-tailwind-css
```

## Usage

- Continue regular development in the main repo
- Use the debug worktree for CSS configuration experiments
- Changes in either location are tracked separately
- Both locations share the same git history but have independent working directories

## Cleanup (when done)

```bash
# Remove worktree
git worktree remove ../debug-worktrees/tailwind-debug

# Delete debug branch (if no longer needed)
git branch -d debug-tailwind-css
```

## Benefits

- Safe experimentation without affecting main development
- Ability to quickly switch between configurations
- Independent working directories for parallel development
- Shared git history for easy comparison