/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `MonitoredCity` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MonitoredCity_uid_key" ON "MonitoredCity"("uid");
