# Technical Context: Pages CMS

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Components**: React 18 with Server Components
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui (based on Radix UI)
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React Context API
- **Notifications**: Sonner toast notifications
- **Rich Text Editing**: TipTap editor
- **Code Editing**: CodeMirror
- **Date Handling**: date-fns

### Backend
- **API Routes**: Next.js API routes and Server Actions
- **Database ORM**: Drizzle ORM
- **Database**: SQLite (local) / Turso (production)
- **Authentication**: Lucia Auth
- **Email**: Resend
- **GitHub Integration**: Octokit SDK
- **Content Parsing**: YAML, JSON, TOML parsers

### DevOps
- **Deployment**: Vercel (recommended)
- **Database Hosting**: Turso (recommended)
- **Version Control**: Git/GitHub

## Development Environment

### Prerequisites
- Node.js (v18+)
- npm or yarn
- GitHub account for testing
- GitHub App for authentication and repository access
- Resend account for email functionality
- Turso account for production database (optional for local development)

### Local Setup
1. Clone repository
2. Install dependencies with `npm install`
3. Set up environment variables in `.env` file
4. Create database with `npm run db:migrate`
5. Run development server with `npm run dev`

### Environment Variables
- `CRYPTO_KEY`: For encrypting GitHub tokens
- `GITHUB_APP_ID`: GitHub App ID
- `GITHUB_APP_NAME`: GitHub App machine name
- `GITHUB_APP_PRIVATE_KEY`: GitHub App private key
- `GITHUB_APP_WEBHOOK_SECRET`: GitHub App webhook secret
- `GITHUB_APP_CLIENT_ID`: GitHub App client ID
- `GITHUB_APP_CLIENT_SECRET`: GitHub App client secret
- `RESEND_API_KEY`: Resend API key for emails
- `SQLITE_URL`: Database URL
- `SQLITE_AUTH_TOKEN`: Database auth token (for Turso)
- `BASE_URL`: Base URL for the application (optional)

## Key Technical Concepts

### GitHub App Integration
Pages CMS uses GitHub Apps for authentication and repository access. This provides several advantages:
- More granular permissions than OAuth apps
- Installation-based access to repositories
- Webhook support for real-time updates
- Better security with installation tokens

### Database Schema
The database schema includes tables for:
- Users and authentication
- Sessions
- GitHub tokens (encrypted)
- Repository history
- Collaborators
- Configuration cache

### Content Configuration
Content is configured through a `.pages.yml` file in the repository root, defining:
- Media settings
- Content collections and files
- Field definitions and validation rules
- View settings for collections

### Field System
The field system is extensible and includes:
- Core field types (string, number, boolean, rich text, etc.)
- Custom field types (can be added by developers)
- Field validation rules
- Field rendering components

### Authentication System
Authentication is handled by Lucia Auth with:
- GitHub OAuth authentication
- Email-based authentication (magic links)
- Session management
- CSRF protection

### File Formats
Pages CMS supports multiple file formats:
- Markdown with YAML, JSON, or TOML frontmatter
- Pure YAML, JSON, or TOML files
- Raw text files
- Custom formats through the field system

## Technical Constraints

### GitHub API Limitations
- Rate limits (5,000 requests per hour for authenticated requests)
- File size limitations (100MB max)
- Repository size limitations

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- No support for Internet Explorer

### Performance Considerations
- Large repositories may have slower loading times
- Media uploads are limited by GitHub's file size restrictions
- Rich text editing performance depends on document size

### Security Considerations
- GitHub tokens must be securely stored
- User permissions are based on GitHub repository access
- Email authentication requires secure email delivery

## Integration Points

### GitHub API
- Repository content access
- Branch management
- Commit operations
- Webhook processing
- User authentication

### Email Service
- Authentication emails
- Collaboration invitations
- Notifications

### Static Site Generators
- Content structure compatibility
- Frontmatter format compatibility
- Media path handling
