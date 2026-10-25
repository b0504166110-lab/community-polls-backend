-- סקר עם כמה שאלות: טבלת PollQuestion בין Poll ל-PollOption.
-- כל סקר קיים הופך לסקר עם שאלה אחת (הכותרת שלו), והאפשרויות וההצבעות נשמרות.

CREATE TABLE "PollQuestion" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "text" VARCHAR(150) NOT NULL,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PollQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PollQuestion_pollId_position_key" ON "PollQuestion"("pollId", "position");

ALTER TABLE "PollQuestion" ADD CONSTRAINT "PollQuestion_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollQuestion"
  ADD CONSTRAINT "PollQuestion_text_length" CHECK (char_length(btrim("text")) BETWEEN 2 AND 150),
  ADD CONSTRAINT "PollQuestion_position_range" CHECK ("position" BETWEEN 1 AND 10);

-- העברת הנתונים הקיימים: שאלה אחת לכל סקר
INSERT INTO "PollQuestion" ("pollId", "text", "allowMultiple", "position")
SELECT "id", "title", "allowMultiple", 1 FROM "Poll";

ALTER TABLE "PollOption" ADD COLUMN "questionId" INTEGER;

UPDATE "PollOption" o
SET "questionId" = q."id"
FROM "PollQuestion" q
WHERE q."pollId" = o."pollId";

ALTER TABLE "PollOption" ALTER COLUMN "questionId" SET NOT NULL;

ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_pollId_fkey";
DROP INDEX "PollOption_pollId_position_key";
DROP INDEX "PollOption_pollId_text_key";
ALTER TABLE "PollOption" DROP COLUMN "pollId";

CREATE UNIQUE INDEX "PollOption_questionId_position_key" ON "PollOption"("questionId", "position");
CREATE UNIQUE INDEX "PollOption_questionId_text_key" ON "PollOption"("questionId", "text");

ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PollQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- הבחירה המרובה עברה מהסקר לשאלה
ALTER TABLE "Poll" DROP COLUMN "allowMultiple";
