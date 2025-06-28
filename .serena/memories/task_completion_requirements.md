# Task Completion Requirements

## Mandatory Steps After Code Changes

### 1. Code Quality Checks
**ALWAYS run these commands in order:**
1. `bun run lint:fix` - Fix ESLint issues automatically
2. `bun run type-check` - Ensure TypeScript compliance
3. `bun run format` - Format code with Prettier
4. `bun run build` - Verify production build works

### 2. Testing Strategy
- **No formal test framework** currently configured
- **Visual testing**: Manual verification of animations and effects
- **Performance testing**: Use built-in PerformanceMonitor component
- **Accessibility testing**: Manual testing with screen readers
- **Cross-browser testing**: Test in different browsers

### 3. Before Deployment
- Ensure all TypeScript errors are resolved
- Verify Three.js components work without errors
- Check that animations respect `prefers-reduced-motion`
- Validate that all images and assets load correctly
- Test responsive design on different screen sizes

### 4. Git Workflow
- **Never commit** unless explicitly asked by user
- Stage only relevant files for commits
- Write clear, descriptive commit messages
- Follow conventional commit format when possible

### 5. Performance Considerations
- Monitor FPS with the built-in performance monitor
- Ensure Three.js resources are properly cleaned up
- Verify animations run at 60fps target
- Check that lazy loading works for dynamic imports

## Failure Recovery
If any of the mandatory steps fail:
1. **Fix the specific issue** before proceeding
2. **Re-run the failed command** to verify the fix
3. **Document the issue** if it reveals a systemic problem
4. **Ask user for guidance** if the issue cannot be resolved