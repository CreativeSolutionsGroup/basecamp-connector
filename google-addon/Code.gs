const WEBHOOK_URL = "https://your-app.vercel.app/api/webhooks/google-forms";
const WEBHOOK_SECRET = "your-shared-secret";

function onFormOpen() {
  const isEnabled = ScriptApp.getProjectTriggers()
    .some(t => t.getHandlerFunction() === "onFormSubmit");

  const lastResult = PropertiesService.getScriptProperties().getProperty("lastWebhookResult");

  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph().setText(
        isEnabled
          ? "✅ Sync is enabled for this form."
          : "⚠️ Sync is not enabled for this form."
      )
    );

  if (lastResult) {
    section.addWidget(
      CardService.newTextParagraph().setText("Last webhook: " + lastResult)
    );
  }

  section
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
    .addWidget(
      CardService.newTextButton()
        .setText("Send Test Webhook")
        .setOnClickAction(CardService.newAction().setFunctionName("sendTestWebhook"))
    );

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Basecamp Form Sync"))
    .addSection(section)
    .build();
}

function installTrigger() {
  removeTrigger();
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
  try {
    const payload = {
      responseId: e.response.getId(),
      formId: e.source.getId(),
      submittedAt: e.response.getTimestamp(),
      answers: e.response.getItemResponses().map(r => ({
        questionId: r.getItem().getId().toString(16),
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
    throw err; // re-throw so it appears in the execution log
  }
}

function sendTestWebhook() {
  try {
    const form = FormApp.getActiveForm();
    const items = form.getItems();

    const answers = items.map(item => ({
      questionId: item.getId().toString(16),
      title: item.getTitle(),
      answer: "Test"
    }));

    const payload = {
      responseId: "test-" + Date.now(),
      formId: form.getId(),
      submittedAt: new Date().toISOString(),
      answers: answers,
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
    const resultText = "HTTP " + code + ": " + body;

    Logger.log("Test webhook response: " + resultText);
    PropertiesService.getScriptProperties().setProperty("lastWebhookResult", resultText);

    const msg = (code >= 200 && code < 300)
      ? "Test sent! " + code + " — " + body
      : "Test failed: " + resultText;

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(msg))
      .setStateChanged(true)
      .build();
  } catch (err) {
    Logger.log("sendTestWebhook ERROR: " + err.message);
    PropertiesService.getScriptProperties().setProperty(
      "lastWebhookResult", "ERROR: " + err.message.substring(0, 150)
    );
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Error: " + err.message))
      .setStateChanged(true)
      .build();
  }
}
