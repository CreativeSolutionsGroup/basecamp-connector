const WEBHOOK_URL = "https://your-app.vercel.app/api/webhooks/google-forms";
const WEBHOOK_SECRET = "your-shared-secret";

function onFormOpen(e) {
  FormApp.getUi()
    .createMenu("Basecamp Sync")
    .addItem("Enable for this form", "installTrigger")
    .addItem("Disable for this form", "removeTrigger")
    .addToUi();
}

function installTrigger() {
  removeTrigger(); // clear duplicates first
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
  FormApp.getUi().alert("Basecamp Sync enabled!");
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "onFormSubmit") ScriptApp.deleteTrigger(t);
  });
}

function onFormSubmit(e) {
  const payload = {
    responseId: e.response.getId(),
    formId: e.source.getId(),
    submittedAt: e.response.getTimestamp(),
    answers: e.response.getItemResponses().map(r => ({
      question: r.getItem().getTitle(),
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
