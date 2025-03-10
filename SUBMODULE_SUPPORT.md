# Submodule Support for Pages CMS

This document explains how to use Pages CMS with Docusaurus repositories that include content from Git submodules.

## Overview

Pages CMS now supports editing content across multiple repositories through Git submodules. This feature allows you to:

- Define which repositories contain your content
- Associate media folders with specific repositories
- Restrict editing to one repository at a time to prevent cross-repository conflicts
- Create pull requests in the correct parent repositories

## Configuration

To enable submodule support, you need to update your `.pages.yml` file with the following sections:

### 1. Repository Definitions

First, define all repositories (main and submodules) in the `repositories` section:

```yaml
repositories:
  - name: "Main Docusaurus"
    repo: "username/docusaurus-repo"
    path: "/"
    
  - name: "API Documentation"
    repo: "username/api-docs"
    path: "docs/api-reference"
    
  - name: "User Guides"
    repo: "username/user-guides"
    path: "docs/guides"
```

Each repository definition requires:
- `name`: A human-readable name for the repository
- `repo`: The GitHub repository name (username/repo-name)
- `path`: The path where the submodule is mounted in the main repository

### 2. Media Folders

Define media folders for each repository:

```yaml
media:
  - name: "Main Images"
    repository: "Main Docusaurus"
    input: "static/img"
    output: "/img"
    extensions: [jpg, jpeg, png, gif, svg]
    
  - name: "API Diagrams"
    repository: "API Documentation"
    input: "images"
    output: "/images"
    extensions: [jpg, jpeg, png, gif, svg]
    
  - name: "User Guide Screenshots"
    repository: "User Guides"
    input: "screenshots"
    output: "/screenshots"
    extensions: [jpg, jpeg, png, gif, svg]
```

Each media definition includes:
- `name`: A descriptive name for the media folder
- `repository`: The name of the repository it belongs to (must match a name from the repositories section)
- `input`: The folder path within the repository
- `output`: The public URL path for the media
- `extensions`: Allowed file extensions

### 3. Content Definitions

Associate content collections with their respective repositories:

```yaml
content:
  - name: "blog"
    repository: "Main Docusaurus"
    label: "Blog Posts"
    type: collection
    path: blog
    format: yaml-frontmatter
    fields:
      - { label: "Title", name: "title", type: "string" }
      - { label: "Publish Date", name: "date", type: "date" }
      - { label: "Featured Image", name: "thumbnail", type: "image", required: false }
      - { label: "Body", name: "body", type: "rich-text" }
      - { label: "Tags", name: "tags", type: "string", list: true, required: false }

  - name: "api-docs"
    repository: "API Documentation"
    label: "API Documentation"
    type: collection
    path: content
    format: yaml-frontmatter
    fields:
      - { label: "Title", name: "title", type: "string" }
      - { label: "Body", name: "body", type: "rich-text" }
      - { label: "Order", name: "sidebar_position", type: "number", required: false }

  - name: "guides"
    repository: "User Guides"
    label: "User Guides"
    type: collection
    path: guides
    format: yaml-frontmatter
    fields:
      - { label: "Title", name: "title", type: "string" }
      - { label: "Body", name: "body", type: "rich-text" }
      - { label: "Order", name: "sidebar_position", type: "number", required: false }
```

The key addition to each content definition is the `repository` property that associates it with a specific repository.

## Complete Example

Here's a complete example that ties everything together:

```yaml
repositories:
  - name: "Main Docusaurus"
    repo: "username/docusaurus-repo"
    path: "/"
    
  - name: "API Documentation"
    repo: "username/api-docs"
    path: "docs/api-reference"
    
  - name: "User Guides"
    repo: "username/user-guides"
    path: "docs/guides"

media:
  - name: "Main Images"
    repository: "Main Docusaurus"
    input: "static/img"
    output: "/img"
    extensions: [jpg, jpeg, png, gif, svg]
    
  - name: "API Diagrams"
    repository: "API Documentation"
    input: "images"
    output: "/images"
    extensions: [jpg, jpeg, png, gif, svg]
    
  - name: "User Guide Screenshots"
    repository: "User Guides"
    input: "screenshots"
    output: "/screenshots"
    extensions: [jpg, jpeg, png, gif, svg]

content:
  - name: "blog"
    repository: "Main Docusaurus"
    label: "Blog Posts"
    type: collection
    path: blog
    format: yaml-frontmatter
    fields:
      - { label: "Title", name: "title", type: "string" }
      - { label: "Publish Date", name: "date", type: "date" }
      - { label: "Featured Image", name: "thumbnail", type: "image", required: false }
      - { label: "Body", name: "body", type: "rich-text" }
      - { label: "Tags", name: "tags", type: "string", list: true, required: false }

  - name: "api-docs"
    repository: "API Documentation"
    label: "API Documentation"
    type: collection
    path: content
    format: yaml-frontmatter
    fields:
      - { label: "Title", name: "title", type: "string" }
      - { label: "Body", name: "body", type: "rich-text" }
      - { label: "Order", name: "sidebar_position", type: "number", required: false }

  - name: "guides"
    repository: "User Guides"
    label: "User Guides"
    type: collection
    path: guides
    format: yaml-frontmatter
    fields:
      - { label: "Title", name: "title", type: "string" }
      - { label: "Body", name: "body", type: "rich-text" }
      - { label: "Order", name: "sidebar_position", type: "number", required: false }
```

## User Workflow

When working with submodules in Pages CMS, the workflow is as follows:

1. **Repository Selection**: When clicking "Make Changes," users are prompted to select which repository they want to edit.

2. **Branch Creation**: A branch is created in the selected repository, and the user is restricted to editing content within that repository only.

3. **Content Editing**: 
   - Content and media from the selected repository are fully editable
   - Content and media from other repositories are visible but disabled for editing
   - A banner at the top of the page indicates which repository is being edited

4. **Pull Request Creation**: When creating a PR, it will be created in the parent repository of the content being edited, not in the submodule directly.

## Troubleshooting

### Content Not Editable

If content appears disabled for editing:
- Check that you've selected the correct repository when creating your branch
- Verify that the content's `repository` property in `.pages.yml` matches the repository name
- Ensure the repository path in `.pages.yml` matches the actual submodule path

### Media Not Showing

If media files aren't appearing:
- Check that the media folder is correctly defined in `.pages.yml`
- Verify that the `repository` property for the media folder matches the repository name
- Ensure the media folder exists in the repository

### Pull Request Issues

If you encounter issues with pull requests:
- Make sure you're only editing content from one repository in a single branch
- Check that the repository definitions in `.pages.yml` are correct
- Verify that your Git submodules are properly set up in the main repository

## Technical Details

The submodule support works by:
1. Detecting Git submodules in the repository
2. Mapping content and media to their respective repositories
3. Restricting editing based on the selected repository
4. Creating pull requests in the appropriate parent repository

This approach ensures that changes to submodule content are properly tracked and that PRs are created in the correct repositories, avoiding issues with cross-repository changes.
