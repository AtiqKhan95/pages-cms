# System Patterns: Pages CMS

## Architecture Overview

Pages CMS follows a modern web application architecture with the following key components:

```mermaid
flowchart TD
    Client[Client Browser] <--> NextJS[Next.js App]
    NextJS <--> DB[(SQLite/Turso DB)]
    NextJS <--> GitHub[GitHub API]
    NextJS <--> Email[Email Service]
    
    subgraph "Core Components"
        Auth[Authentication]
        Repo[Repository Management]
        Content[Content Management]
        Media[Media Management]
        Collab[Collaboration]
    end
    
    NextJS --- Core Components
```

### Key Architectural Decisions

1. **Next.js App Router**: Using the latest Next.js app router for routing and API endpoints
2. **Server Components**: Leveraging React Server Components for improved performance
3. **SQLite/Turso**: Using SQLite locally and Turso for production for simplicity and performance
4. **GitHub App Integration**: Direct integration with GitHub via GitHub Apps for secure access
5. **Stateless Design**: No server-side session state, relying on tokens and database

## Core Design Patterns

### Repository Pattern

The system uses a repository pattern to abstract data access:

```mermaid
flowchart LR
    Components[UI Components] --> Actions[Server Actions]
    Actions --> Utils[Utility Functions]
    Utils --> GitHub[GitHub API]
    Utils --> DB[(Database)]
```

### Context Providers

React Context is used for global state management:

1. **UserContext**: Manages current user information and authentication state
2. **RepoContext**: Manages selected repository, branch, and related information
3. **ConfigContext**: Manages the configuration for the current repository

### Component Hierarchy

```mermaid
flowchart TD
    Layout[Layout Component] --> Nav[Navigation]
    Layout --> Main[Main Content Area]
    
    Main --> RepoLayout[Repository Layout]
    RepoLayout --> Collections[Collections View]
    RepoLayout --> Entries[Entries View]
    RepoLayout --> Media[Media View]
    
    Collections --> CollectionTable[Collection Table]
    Entries --> EntryForm[Entry Form]
    Entries --> EntryEditor[Entry Editor]
    Media --> MediaUpload[Media Upload]
    Media --> MediaView[Media View]
```

## Data Flow Patterns

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant GitHub
    participant Database
    
    User->>App: Login Request
    App->>GitHub: OAuth Flow
    GitHub->>App: Authorization Code
    App->>GitHub: Exchange for Token
    GitHub->>App: Access Token
    App->>Database: Store Encrypted Token
    App->>User: Session Cookie
```

### Content Editing Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant GitHub
    
    User->>App: Edit Content
    App->>GitHub: Fetch Current Content
    GitHub->>App: Content Data
    App->>User: Display Editor
    User->>App: Save Changes
    App->>GitHub: Commit Changes
    GitHub->>App: Commit Result
    App->>User: Success Confirmation
```

## Field System Architecture

The system uses a registry pattern for field types:

```mermaid
flowchart TD
    Registry[Field Registry] --> CoreFields[Core Fields]
    Registry --> CustomFields[Custom Fields]
    
    CoreFields --> String[String Field]
    CoreFields --> Number[Number Field]
    CoreFields --> Boolean[Boolean Field]
    CoreFields --> RichText[Rich Text Field]
    CoreFields --> Date[Date Field]
    CoreFields --> Image[Image Field]
    
    subgraph "Field Components"
        Edit[Edit Component]
        View[View Component]
        Validation[Validation Logic]
    end
    
    String --- Field Components
```

Each field type implements:
1. Edit component for modifying values
2. View component for displaying values
3. Validation logic
4. Serialization/deserialization logic

## Configuration System

The configuration is defined in a `.pages.yml` file in the repository root:

```mermaid
flowchart TD
    Config[.pages.yml] --> Media[Media Configuration]
    Config --> Content[Content Configuration]
    Config --> Settings[Settings]
    
    Content --> Collections[Collections]
    Content --> Files[Single Files]
    
    Collections --> Fields[Field Definitions]
    Files --> Fields
```

## Error Handling Strategy

1. **Client-side validation**: Form validation using React Hook Form and Zod
2. **Server-side validation**: API endpoint validation with Zod schemas
3. **Error boundaries**: React error boundaries for UI error containment
4. **Toast notifications**: User-friendly error messages via Sonner
5. **Logging**: Error logging for debugging and monitoring

## Security Patterns

1. **Token encryption**: GitHub tokens encrypted in the database
2. **Authentication**: GitHub OAuth and email-based authentication
3. **Authorization**: Repository-level permissions based on GitHub access
4. **CSRF protection**: Built-in Next.js CSRF protection
5. **Input validation**: Strict validation of all user inputs
