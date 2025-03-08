# Product Context: Pages CMS

## Problem Statement
Static site generators have gained popularity due to their performance, security, and simplicity. However, they often lack user-friendly content management interfaces, making it difficult for non-technical users to contribute content. This forces teams to either:

1. Train all content contributors on Git workflows and markdown
2. Implement complex deployment pipelines with traditional CMSes
3. Use proprietary services that may have limitations or costs

Pages CMS addresses this gap by providing a simple, open-source solution that connects directly to GitHub repositories, allowing non-technical users to edit content without learning Git or command-line tools.

## User Experience Goals

### For Content Creators
- **Simplicity**: Edit content without understanding Git concepts
- **Familiarity**: Use familiar editing interfaces like rich text editors
- **Confidence**: Preview changes before publishing
- **Efficiency**: Quickly find and update content without technical barriers

### For Developers
- **Control**: Maintain Git-based workflows and version control
- **Flexibility**: Support various static site generators and content formats
- **Extensibility**: Customize the CMS to fit specific project needs
- **Independence**: Self-host without reliance on proprietary services

### For Teams
- **Collaboration**: Work together on content with appropriate permissions
- **Transparency**: Track who made changes and when
- **Consistency**: Ensure content follows defined structures and formats

## User Journeys

### Content Creator Journey
1. Receive an invitation to collaborate on a website
2. Log in with GitHub or email authentication
3. Navigate to the content they need to edit
4. Make changes using intuitive editors
5. Preview changes if available
6. Save changes directly to the repository
7. See their changes reflected on the website after build/deploy

### Developer Journey
1. Set up Pages CMS for their project
2. Configure content types and fields
3. Invite content creators to collaborate
4. Continue using preferred development workflows
5. Review content changes through normal Git processes

### Administrator Journey
1. Deploy Pages CMS instance
2. Connect to GitHub and set up authentication
3. Configure repositories and branches
4. Manage collaborator access and permissions
5. Monitor usage and troubleshoot issues

## Competitive Landscape

### Direct Alternatives
- **Netlify CMS / Decap CMS**: Similar Git-based CMS, but with different architecture
- **Forestry.io / TinaCMS**: Git-based CMS with visual editing
- **Contentful, Sanity, etc.**: Headless CMSes with proprietary storage

### Advantages of Pages CMS
- Direct GitHub integration through GitHub Apps
- Simple, focused user interface
- Support for various content formats
- Open-source and self-hostable
- Minimal configuration required for basic use cases

## Success Metrics
- Number of active repositories managed
- Number of content edits made through the system
- User satisfaction with editing experience
- Reduction in onboarding time for new content contributors
- Adoption by development teams
