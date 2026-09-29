-- CreateEnum
CREATE TYPE "ResetPurpose" AS ENUM ('activation', 'reset');

-- AlterTable
ALTER TABLE "password_resets" ADD COLUMN     "purpose" "ResetPurpose" NOT NULL DEFAULT 'reset';
