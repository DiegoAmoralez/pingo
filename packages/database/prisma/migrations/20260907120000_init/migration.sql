-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PERSONAL', 'PRO', 'AGENCY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');
CREATE TYPE "MonitorStatus" AS ENUM ('UP', 'DOWN', 'UNKNOWN');
CREATE TYPE "CheckStatus" AS ENUM ('UP', 'DOWN', 'UNKNOWN');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "ErrorCategory" AS ENUM ('DNS_ERROR', 'CONNECTION_REFUSED', 'CONNECTION_TIMEOUT', 'TLS_ERROR', 'HTTP_ERROR', 'REDIRECT_ERROR', 'SSRF_BLOCKED', 'UNKNOWN');
CREATE TYPE "NotificationType" AS ENUM ('WEBSITE_DOWN', 'WEBSITE_RECOVERY', 'SSL_EXPIRY', 'DOMAIN_EXPIRY', 'DNS_CHANGED', 'NS_CHANGED', 'DOMAIN_CHANGED', 'TEST');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "plan" "PlanCode" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Monitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domainId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "rootDomain" TEXT NOT NULL,
    "displayHostname" TEXT NOT NULL,
    "status" "MonitorStatus" NOT NULL DEFAULT 'UNKNOWN',
    "checkIntervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 10,
    "expectedStatusCodes" TEXT NOT NULL DEFAULT '200-399',
    "followRedirects" BOOLEAN NOT NULL DEFAULT true,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessfulAt" TIMESTAMP(3),
    "currentLatencyMs" INTEGER,
    "currentHttpStatus" INTEGER,
    "lastErrorType" "ErrorCategory",
    "lastErrorMessage" TEXT,
    "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextSslCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDnsCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "lastManualCheckAt" TIMESTAMP(3),
    "firstCheckProgress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MonitorCheck" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "httpStatus" INTEGER,
    "latencyMs" INTEGER,
    "errorType" "ErrorCategory",
    "errorMessage" TEXT,
    "redirectTarget" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitorCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "reason" TEXT,
    "firstFailure" JSONB,
    "lastFailure" JSONB,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SslRecord" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "issuer" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "fingerprint" TEXT,
    "daysRemaining" INTEGER,
    "lastAlertThreshold" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SslRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rootDomain" TEXT NOT NULL,
    "displayDomain" TEXT NOT NULL,
    "registrar" TEXT,
    "registeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "updatedAtRegistry" TIMESTAMP(3),
    "status" TEXT,
    "nameservers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rdapSource" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAlertThreshold" INTEGER,
    "lastError" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'rdap',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DnsSnapshot" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "records" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DnsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "username" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramConnectToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramConnectToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monitorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deduplicationKey" TEXT NOT NULL,
    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteDowntime" BOOLEAN NOT NULL DEFAULT true,
    "websiteRecovery" BOOLEAN NOT NULL DEFAULT true,
    "sslExpiration" BOOLEAN NOT NULL DEFAULT true,
    "domainExpiration" BOOLEAN NOT NULL DEFAULT true,
    "dnsChanges" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,
    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_plan_status_idx" ON "Subscription"("plan", "status");
CREATE INDEX "Monitor_userId_idx" ON "Monitor"("userId");
CREATE INDEX "Monitor_status_idx" ON "Monitor"("status");
CREATE INDEX "Monitor_nextCheckAt_idx" ON "Monitor"("nextCheckAt");
CREATE INDEX "Monitor_nextSslCheckAt_idx" ON "Monitor"("nextSslCheckAt");
CREATE INDEX "Monitor_nextDnsCheckAt_idx" ON "Monitor"("nextDnsCheckAt");
CREATE INDEX "Monitor_domainId_idx" ON "Monitor"("domainId");
CREATE INDEX "MonitorCheck_monitorId_checkedAt_idx" ON "MonitorCheck"("monitorId", "checkedAt");
CREATE INDEX "Incident_monitorId_startedAt_idx" ON "Incident"("monitorId", "startedAt");
CREATE INDEX "Incident_status_startedAt_idx" ON "Incident"("status", "startedAt");
CREATE UNIQUE INDEX "SslRecord_monitorId_key" ON "SslRecord"("monitorId");
CREATE UNIQUE INDEX "Domain_userId_rootDomain_key" ON "Domain"("userId", "rootDomain");
CREATE INDEX "Domain_rootDomain_idx" ON "Domain"("rootDomain");
CREATE INDEX "Domain_nextCheckAt_idx" ON "Domain"("nextCheckAt");
CREATE INDEX "DnsSnapshot_monitorId_createdAt_idx" ON "DnsSnapshot"("monitorId", "createdAt");
CREATE INDEX "DomainEvent_domainId_createdAt_idx" ON "DomainEvent"("domainId", "createdAt");
CREATE UNIQUE INDEX "TelegramConnection_userId_key" ON "TelegramConnection"("userId");
CREATE INDEX "TelegramConnection_telegramUserId_idx" ON "TelegramConnection"("telegramUserId");
CREATE INDEX "TelegramConnection_telegramChatId_idx" ON "TelegramConnection"("telegramChatId");
CREATE UNIQUE INDEX "TelegramConnectToken_tokenHash_key" ON "TelegramConnectToken"("tokenHash");
CREATE INDEX "TelegramConnectToken_userId_idx" ON "TelegramConnectToken"("userId");
CREATE UNIQUE INDEX "NotificationEvent_deduplicationKey_key" ON "NotificationEvent"("deduplicationKey");
CREATE INDEX "NotificationEvent_userId_createdAt_idx" ON "NotificationEvent"("userId", "createdAt");
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");
CREATE INDEX "StatusPage_userId_idx" ON "StatusPage"("userId");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MonitorCheck" ADD CONSTRAINT "MonitorCheck_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SslRecord" ADD CONSTRAINT "SslRecord_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DnsSnapshot" ADD CONSTRAINT "DnsSnapshot_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramConnection" ADD CONSTRAINT "TelegramConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramConnectToken" ADD CONSTRAINT "TelegramConnectToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
