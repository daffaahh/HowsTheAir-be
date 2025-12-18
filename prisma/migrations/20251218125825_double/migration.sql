-- CreateTable
CREATE TABLE "AirQuality" (
    "id" SERIAL NOT NULL,
    "stationName" TEXT NOT NULL,
    "monitoredCityId" INTEGER NOT NULL,
    "aqi" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirQuality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirQualityHistory" (
    "id" SERIAL NOT NULL,
    "monitoredCityId" INTEGER NOT NULL,
    "aqi" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "SyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirQualityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredCity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredCity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirQuality_monitoredCityId_key" ON "AirQuality"("monitoredCityId");

-- CreateIndex
CREATE UNIQUE INDEX "AirQualityHistory_monitoredCityId_recordedAt_key" ON "AirQualityHistory"("monitoredCityId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredCity_keyword_key" ON "MonitoredCity"("keyword");
