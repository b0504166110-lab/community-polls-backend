-- אילוצי תקינות ברמת מסד הנתונים (שכבת הגנה נוספת מעבר לוולידציה בשרת)

ALTER TABLE "User"
  ADD CONSTRAINT "User_name_length" CHECK (char_length(btrim("name")) BETWEEN 2 AND 50),
  ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));

ALTER TABLE "Poll"
  ADD CONSTRAINT "Poll_title_length" CHECK (char_length(btrim("title")) BETWEEN 5 AND 150),
  ADD CONSTRAINT "Poll_rejection_only_when_rejected" CHECK ("rejectionReason" IS NULL OR "status" = 'REJECTED'),
  ADD CONSTRAINT "Poll_hidden_only_when_approved" CHECK ("isHidden" = false OR "status" = 'APPROVED');

ALTER TABLE "PollOption"
  ADD CONSTRAINT "PollOption_text_not_empty" CHECK (char_length(btrim("text")) >= 1),
  ADD CONSTRAINT "PollOption_position_range" CHECK ("position" BETWEEN 1 AND 6);
