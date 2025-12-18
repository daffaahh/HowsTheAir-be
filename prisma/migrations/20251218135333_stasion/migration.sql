/*
  Warnings:

  - You are about to drop the column `stationName` on the `AirQuality` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `MonitoredCity` table. All the data in the column will be lost.
  - Added the required column `stationName` to the `MonitoredCity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AirQuality" DROP COLUMN "stationName";

-- AlterTable
ALTER TABLE "MonitoredCity" DROP COLUMN "name",
ADD COLUMN     "stationName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "AirQuality" ADD CONSTRAINT "AirQuality_monitoredCityId_fkey" FOREIGN KEY ("monitoredCityId") REFERENCES "MonitoredCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirQualityHistory" ADD CONSTRAINT "AirQualityHistory_monitoredCityId_fkey" FOREIGN KEY ("monitoredCityId") REFERENCES "MonitoredCity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
