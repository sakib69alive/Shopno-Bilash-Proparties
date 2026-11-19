CREATE TABLE "PortalInstallEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalInstallEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortalInstallEvent_userId_deviceId_occurredAt_idx"
    ON "PortalInstallEvent"("userId", "deviceId", "occurredAt");
