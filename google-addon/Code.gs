const WEBHOOK_URL = "https://your-app.vercel.app/api/webhooks/google-forms";
const WEBHOOK_SECRET = "your-shared-secret";

function onFormOpen() {
  const isEnabled = ScriptApp.getProjectTriggers()
    .some(t => t.getHandlerFunction() === "onFormSubmit");

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Basecamp Form Sync"))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            isEnabled
              ? "✅ Sync is enabled for this form."
              : "⬜ Sync is not enabled for this form."
          )
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Enable sync")
            .setOnClickAction(CardService.newAction().setFunctionName("installTrigger"))
        )
        .addWidget(
          CardService.newTextButton()
            .setText("Disable sync")
            .setOnClickAction(CardService.newAction().setFunctionName("removeTrigger"))
        )
    )
    .build();
}

function installTrigger() {
  removeTrigger(); // clear duplicates first
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("Basecamp sync enabled."))
    .setStateChanged(true)
    .build();
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "onFormSubmit") ScriptApp.deleteTrigger(t);
  });
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText("Basecamp sync disabled."))
    .setStateChanged(true)
    .build();
}

function onFormSubmit(e) {
  const payload = {
    responseId: e.response.getId(),
    formId: e.source.getId(),
    submittedAt: e.response.getTimestamp(),
    answers: e.response.getItemResponses().map(r => ({
      questionId: r.getItem().getId().toString(16),
      answer: r.getResponse()
    }))
  };
  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { "x-webhook-secret": WEBHOOK_SECRET }
  });
}
