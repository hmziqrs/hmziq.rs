# Project Structure

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main landing page  
│   └── globals.css        # Global styles and Tailwind imports
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── three/             # Three.js components (StarField, etc.)
│   ├── sections/          # Page sections (Hero, About, Skills, Contact)
│   ├── effects/           # 2D canvas effects (Nebula, Meteor, etc.)
│   ├── performance/       # Performance monitoring components
│   └── debug/             # Debug and testing components
├── lib/                   # Utility functions and configurations
│   ├── utils.ts           # General helper functions
│   ├── performance/       # Performance optimization utilities
│   └── three-utils.ts     # Three.js specific utilities (if exists)
├── hooks/                 # Custom React hooks
├── public/                # Static assets
├── docs/                  # Project documentation
│   ├── optimization-results/  # Performance optimization docs
│   └── improvements/      # Feature improvement documentation
├── legacy/                # Moved unused/old files
└── .serena/               # Serena agent configuration
```

## Key Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration  
- `.prettierrc` - Prettier formatting rules
- `next.config.mjs` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration
- `CLAUDE.md` - Project instructions for Claude Code