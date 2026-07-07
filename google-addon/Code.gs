const WEBHOOK_URL = "";
const WEBHOOK_SECRET = "";

function onOpen(e) {
  FormApp.getUi()
    .createAddonMenu()
    .addItem("Enable Sync", "installTrigger")
    .addItem("Disable Sync", "removeTrigger")
    .addItem("Send Test Webhook", "sendTestWebhook")
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function installTrigger() {
  removeTriggerForForm_(FormApp.getActiveForm().getId());
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
  FormApp.getUi().alert("Basecamp sync enabled.");
}

function removeTrigger() {
  removeTriggerForForm_(FormApp.getActiveForm().getId());
  FormApp.getUi().alert("Basecamp sync disabled.");
}

// Private helper: deletes onFormSubmit triggers scoped to a specific form only.
// Trailing underscore is the Apps Script convention for private functions.
function removeTriggerForForm_(formId) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "onFormSubmit" && t.getTriggerSourceId() === formId) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function onFormSubmit(e) {
  try {
    const payload = {
      responseId: e.response.getId(),
      formId: e.source.getId(),
      submittedAt: e.response.getTimestamp(),
      answers: e.response.getItemResponses().map(r => ({
        questionId: r.getItem().getId().toString(16).padStart(8, "0"),
        title: r.getItem().getTitle(),
        answer: r.getResponse()
      }))
    };

    Logger.log("Sending webhook payload: " + JSON.stringify(payload));

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const result = code + " " + response.getContentText().substring(0, 100);
    Logger.log("Webhook response: " + result);
    PropertiesService.getScriptProperties().setProperty("lastWebhookResult", result);

    if (code < 200 || code >= 300) {
      throw new Error("Webhook returned HTTP " + code + ": " + response.getContentText());
    }
  } catch (err) {
    Logger.log("onFormSubmit ERROR: " + err.message);
    PropertiesService.getScriptProperties().setProperty(
      "lastWebhookResult", "ERROR: " + err.message.substring(0, 150)
    );
    throw err;
  }
}

function sendTestWebhook() {
  try {
    const form = FormApp.getActiveForm();
    const items = form.getItems();

    const payload = {
      responseId: "test-" + Date.now(),
      formId: form.getId(),
      submittedAt: new Date().toISOString(),
      answers: items.map(item => ({
        questionId: item.getId().toString(16).padStart(8, "0"),
        title: item.getTitle(),
        answer: "Test"
      })),
      isTest: true
    };

    Logger.log("Sending test webhook: " + JSON.stringify(payload));

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const body = response.getContentText().substring(0, 150);
    PropertiesService.getScriptProperties().setProperty("lastWebhookResult", "HTTP " + code + ": " + body);

    const msg = (code >= 200 && code < 300)
      ? "Test sent successfully! HTTP " + code + " — " + body
      : "Test failed: HTTP " + code + " — " + body;

    FormApp.getUi().alert(msg);
  } catch (err) {
    Logger.log("sendTestWebhook ERROR: " + err.message);
    PropertiesService.getScriptProperties().setProperty(
      "lastWebhookResult", "ERROR: " + err.message.substring(0, 150)
    );
    FormApp.getUi().alert("Error: " + err.message);
  }
}
