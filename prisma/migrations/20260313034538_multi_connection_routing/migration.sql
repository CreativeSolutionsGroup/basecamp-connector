-- DropIndex
DROP INDEX "connections_form_id_key";

-- AlterTable
ALTER TABLE "connections" ADD COLUMN     "routing_question_id" TEXT,
ADD COLUMN     "routing_value" TEXT;
