# PlusOps Initial ER Diagram

```mermaid
erDiagram
  USER ||--o{ TEAM_MEMBER : joins
  USER ||--o{ USER_ROLE : has
  ROLE ||--o{ USER_ROLE : assigned
  ROLE ||--o{ ROLE_PERMISSION : grants
  PERMISSION ||--o{ ROLE_PERMISSION : included
  USER ||--o{ AUTH_SESSION : owns
  AUTH_SESSION ||--o{ REFRESH_TOKEN : rotates
  USER ||--o{ EMAIL_VERIFICATION_TOKEN : verifies
  USER ||--o{ PASSWORD_RESET_TOKEN : resets
  USER ||--o{ OAUTH_ACCOUNT : links
  TEAM ||--o{ TEAM_MEMBER : has
  TEAM ||--o{ SERVICE : owns
  SERVICE ||--o{ SERVICE_ENVIRONMENT : runs_in
  ENVIRONMENT ||--o{ SERVICE_ENVIRONMENT : hosts
  SERVICE ||--o{ SERVICE_DEPENDENCY : upstream
  SERVICE ||--o{ SERVICE_DEPENDENCY : downstream
  SERVICE ||--o{ DEPLOYMENT : receives
  ENVIRONMENT ||--o{ DEPLOYMENT : targets
  USER ||--o{ SERVICE_DEPENDENCY : creates
  USER ||--o{ DEPLOYMENT : deploys
  SERVICE ||--o{ INCIDENT : experiences
  USER ||--o{ INCIDENT : reports
  USER ||--o{ INCIDENT : assigned
  INCIDENT ||--o{ INCIDENT_COMMENT : contains
  INCIDENT ||--o{ INCIDENT_MENTION : mentions
  INCIDENT ||--o{ INCIDENT_ATTACHMENT : stores
  INCIDENT ||--o{ INCIDENT_TIMELINE_EVENT : records
  INCIDENT_COMMENT ||--o{ INCIDENT_MENTION : contains
  USER ||--o{ INCIDENT_MENTION : mentioned
  USER ||--o{ INCIDENT_ATTACHMENT : uploads
  USER ||--o{ INCIDENT_TIMELINE_EVENT : performs
  USER ||--o{ AUDIT_LOG : performs

  USER {
    string id PK
    string email UK
    string name
    string passwordHash
    boolean isActive
    datetime emailVerifiedAt
    datetime lastLoginAt
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  ROLE {
    string id PK
    string key UK
    string name
    string description
    boolean isSystem
    datetime createdAt
    datetime updatedAt
  }

  PERMISSION {
    string id PK
    string key UK
    string description
    datetime createdAt
    datetime updatedAt
  }

  USER_ROLE {
    string id PK
    string userId FK
    string roleId FK
    string assignedByUserId
    datetime assignedAt
  }

  ROLE_PERMISSION {
    string roleId PK, FK
    string permissionId PK, FK
    datetime createdAt
  }

  AUTH_SESSION {
    string id PK
    string userId FK
    string ipAddress
    string userAgent
    datetime lastSeenAt
    datetime expiresAt
    datetime revokedAt
    string revokedReason
    datetime createdAt
    datetime updatedAt
  }

  REFRESH_TOKEN {
    string id PK
    string sessionId FK
    string tokenHash UK
    datetime expiresAt
    datetime lastUsedAt
    datetime rotatedAt
    datetime revokedAt
    string revokedReason
    string replacedByTokenId UK
    datetime createdAt
  }

  EMAIL_VERIFICATION_TOKEN {
    string id PK
    string userId FK
    string tokenHash UK
    string sentToEmail
    datetime expiresAt
    datetime consumedAt
    datetime createdAt
  }

  PASSWORD_RESET_TOKEN {
    string id PK
    string userId FK
    string tokenHash UK
    datetime expiresAt
    datetime consumedAt
    datetime createdAt
  }

  OAUTH_ACCOUNT {
    string id PK
    string userId FK
    string provider
    string providerAccountId
    string email
    datetime createdAt
    datetime updatedAt
  }

  TEAM {
    string id PK
    string name UK
    string slug UK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  SERVICE {
    string id PK
    string name
    string slug UK
    string description
    string ownerTeamId FK
    string repositoryUrl
    string apiBaseUrl
    string documentationUrl
    string runbookUrl
    string lifecycleStatus
    string visibility
    int tier
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  ENVIRONMENT {
    string id PK
    string name
    string slug UK
    string type
    string description
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  SERVICE_ENVIRONMENT {
    string id PK
    string serviceId FK
    string environmentId FK
    string baseUrl
    datetime createdAt
    datetime deletedAt
  }

  SERVICE_DEPENDENCY {
    string id PK
    string upstreamServiceId FK
    string downstreamServiceId FK
    string description
    string createdByUserId FK
    datetime createdAt
    datetime deletedAt
  }

  DEPLOYMENT {
    string id PK
    string serviceId FK
    string environmentId FK
    string version
    string commitSha
    string repositoryUrl
    string status
    string deployedByUserId FK
    datetime startedAt
    datetime finishedAt
    datetime createdAt
  }

  INCIDENT {
    string id PK
    string title
    string description
    string severity
    string priority
    string status
    string serviceId FK
    string reporterId FK
    string assigneeId FK
    string customerImpact
    datetime startedAt
    datetime resolvedAt
    datetime closedAt
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  INCIDENT_COMMENT {
    string id PK
    string incidentId FK
    string authorId FK
    string body
    datetime editedAt
    datetime createdAt
    datetime deletedAt
  }

  INCIDENT_MENTION {
    string id PK
    string incidentId FK
    string commentId FK
    string mentionedUserId FK
    string handle
    datetime createdAt
  }

  INCIDENT_ATTACHMENT {
    string id PK
    string incidentId FK
    string uploadedByUserId FK
    string filename
    string contentType
    int size
    string storageKey UK
    datetime uploadedAt
    datetime deletedAt
  }

  INCIDENT_TIMELINE_EVENT {
    string id PK
    string incidentId FK
    string actorUserId FK
    string type
    string message
    json metadata
    datetime createdAt
  }

  AUDIT_LOG {
    string id PK
    string actorUserId FK
    string action
    string entityType
    string entityId
    json metadata
    datetime createdAt
  }
```
