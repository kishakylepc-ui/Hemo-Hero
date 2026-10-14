// ============================================================
// MEETING TIME AGREEMENT
//
// A meeting time set in the chat is a suggestion ('proposed')
// until the other side agrees ('agreed'). Either side can
// suggest another time instead, which goes back to them.
//
// status NULL: set before agreement existed (or restored from
// an older backup). It was accepted as it was, so it counts
// as agreed.
//
// Columns from 20261014_schedule_agreement.sql.
// ============================================================

function isScheduleAgreed(
  schedule
) {
  return Boolean(
    schedule &&
    (schedule.status ||
      'agreed') ===
      'agreed'
  );
}

// The agreement columns to save when a user sets a time.
// Saving exactly the time the other side suggested is the same
// as agreeing to it; any other time is a new suggestion.
function getScheduleSaveAgreement(
  existingSchedule,
  userId,
  scheduledAtMs,
  nowIso
) {
  const agreesWithTheirTime =
    Boolean(
      existingSchedule &&
      existingSchedule.status ===
        'proposed' &&
      existingSchedule.proposed_by &&
      existingSchedule.proposed_by !==
        userId &&
      new Date(
        existingSchedule.scheduled_at
      ).getTime() ===
        scheduledAtMs
    );

  return {
    agreesWithTheirTime,

    fields:
      agreesWithTheirTime
        ? {
            status:
              'agreed',

            proposed_by:
              existingSchedule.proposed_by,

            agreed_at:
              nowIso
          }
        : {
            status:
              'proposed',

            proposed_by:
              userId,

            agreed_at:
              null
          }
  };
}

module.exports = {
  isScheduleAgreed,
  getScheduleSaveAgreement
};
