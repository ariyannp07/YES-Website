/** Private YES calendar backend. Only the website server holds the shared secret. */
const CALENDAR_CONFIG = {
  SHEET_NAME: "Events",
  PUBLIC_VISIBILITIES: ["Public", "YES", "Common Room"],
  HEADERS: [
    "id",
    "event_name",
    "event_type",
    "start_date",
    "start_time",
    "end_date",
    "end_time",
    "location",
    "status",
    "visibility",
    "owner",
    "description",
    "rsvp_url",
    "image_url",
    "featured",
    "notes",
  ],
};

// An Apps Script URL alone never grants access to calendar data.
function doGet() {
  return json_({ error: "unauthorized" });
}

function doPost(request) {
  let body;
  try {
    body = JSON.parse(request.postData.contents);
  } catch (_) {
    return json_({ error: "unauthorized" });
  }
  const secret = PropertiesService.getScriptProperties().getProperty(
    "CALENDAR_BACKEND_SECRET",
  );
  if (
    !secret ||
    secret.length < 32 ||
    !body ||
    typeof body.secret !== "string" ||
    !constantEqual_(secret, body.secret)
  ) {
    return json_({ error: "unauthorized" });
  }
  if (body.action === "access") return accessResponse_(body.email);
  if (["invite_create", "invite_claim", "guest_access"].indexOf(body.action) !== -1)
    return invitationResponse_(body);
  if (body.action !== "events") return json_({ error: "invalid_action" });
  return eventsResponse_();
}

function constantEqual_(expected, actual) {
  if (expected.length !== actual.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++)
    mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return mismatch === 0;
}

function accessResponse_(email) {
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    return json_({ allowed: false });
  try {
    const id =
      PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!id) throw new Error("Missing spreadsheet configuration.");
    const allowed = enabledMembers_(SpreadsheetApp.openById(id)).indexOf(email.trim().toLowerCase()) !== -1;
    return json_({ allowed: allowed });
  } catch (_) {
    console.error("YES calendar: access lookup failed.");
    return json_({ error: "access_unavailable" });
  }
}

function eventsResponse_() {
  try {
    const id =
      PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!id) throw new Error("Set the SPREADSHEET_ID script property.");
    const spreadsheet = SpreadsheetApp.openById(id);
    const sheet = spreadsheet.getSheetByName(CALENDAR_CONFIG.SHEET_NAME);
    if (!sheet) throw new Error("Missing Events tab.");
    const timezone = spreadsheet.getSpreadsheetTimeZone();
    const events = [];
    // Never accept a query parameter that disables the publication gate.
    selectPublished_(readEventRows_(sheet)).forEach(function (entry) {
      try {
        events.push(toPublicEvent_(entry.row, timezone));
      } catch (error) {
        console.warn(
          "Skipping invalid calendar row " +
            entry.rowNumber +
            ": " +
            error.message,
        );
      }
    });
    events.sort(function (a, b) {
      return (a.start_at || a.start_date).localeCompare(
        b.start_at || b.start_date,
      );
    });
    return json_({ timezone: timezone, events: events });
  } catch (error) {
    console.error("YES calendar: " + error.message);
    // Apps Script ContentService does not expose a response status-code setter.
    return json_({ error: "calendar_unavailable" });
  }
}

// A future authenticated internal API can reuse this reader behind its own auth.
// This function is never exposed directly by an unauthenticated endpoint.
function readEventRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function (value) {
    return String(value).trim();
  });
  CALENDAR_CONFIG.HEADERS.forEach(function (header) {
    if (
      headers.indexOf(header) === -1 ||
      headers.indexOf(header) !== headers.lastIndexOf(header)
    ) {
      throw new Error("Missing or duplicate column: " + header);
    }
  });
  return values
    .slice(1)
    .map(function (values, index) {
      const row = {};
      CALENDAR_CONFIG.HEADERS.forEach(function (header) {
        row[header] = values[headers.indexOf(header)];
      });
      return { row: row, rowNumber: index + 2 };
    })
    .filter(function (entry) {
      return text_(entry.row.event_name) !== "";
    });
}

function selectPublished_(entries) {
  return entries.filter(function (entry) {
    return (
      entry.row.status === "Published" &&
      CALENDAR_CONFIG.PUBLIC_VISIBILITIES.indexOf(entry.row.visibility) !== -1
    );
  });
}

function toPublicEvent_(row, timezone) {
  const startDate = date_(row.start_date, timezone);
  let endDate = date_(row.end_date, timezone) || startDate;
  const startTime = time_(row.start_time, timezone);
  const endTime = time_(row.end_time, timezone);
  if (!startDate) throw new Error("start_date is required.");
  if (!startTime && endTime)
    throw new Error("An end time requires a start time.");
  if (!text_(row.end_date) && startTime && endTime && endTime < startTime) {
    const next = new Date(endDate + "T12:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    endDate = next.toISOString().slice(0, 10);
  }
  if (
    endDate < startDate ||
    (endDate === startDate && endTime && endTime < startTime)
  )
    throw new Error("End precedes start.");
  // Explicit allowlist: owner, notes, row numbers, Sheet IDs, and permissions never leave the server.
  return {
    id: text_(row.id),
    event_name: text_(row.event_name),
    event_type: text_(row.event_type) || "Other",
    start_date: startDate,
    start_time: startTime,
    end_date: endDate,
    end_time: endTime,
    // These are ISO local date-times in the response timezone, not UTC instants.
    start_at: startTime ? startDate + "T" + startTime + ":00" : startDate,
    end_at: endTime ? endDate + "T" + endTime + ":00" : endDate,
    all_day: !startTime,
    location: text_(row.location),
    status: "Published",
    visibility: row.visibility,
    description: text_(row.description),
    rsvp_url: webURL_(row.rsvp_url),
    image_url: webURL_(row.image_url),
    featured:
      row.featured === true || text_(row.featured).toUpperCase() === "TRUE",
  };
}
function text_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function date_(value, timezone) {
  if (value instanceof Date && !isNaN(value.getTime()))
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  const text = text_(value);
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new Error("Use a Sheet date or YYYY-MM-DD.");
  const parsed = new Date(text + "T12:00:00Z");
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text)
    throw new Error("Invalid date.");
  return text;
}
function time_(value, timezone) {
  if (value instanceof Date && !isNaN(value.getTime()))
    return Utilities.formatDate(value, timezone, "HH:mm");
  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 1440) % 1440;
    return (
      ("0" + Math.floor(minutes / 60)).slice(-2) +
      ":" +
      ("0" + (minutes % 60)).slice(-2)
    );
  }
  const text = text_(value);
  if (!text) return "";
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(text))
    throw new Error("Use a Sheet time or 24-hour HH:mm.");
  return text.slice(0, 5);
}
function webURL_(value) {
  const text = text_(value);
  return /^https?:\/\//i.test(text) ? text : "";
}
function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** Run once in the editor after creating the headers. Changes validation/formatting only. */
function configureEventSheet() {
  const id =
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Set SPREADSHEET_ID first.");
  const spreadsheet = SpreadsheetApp.openById(id);
  const sheet = spreadsheet.getSheetByName(CALENDAR_CONFIG.SHEET_NAME);
  if (!sheet)
    throw new Error("Create an Events tab with the documented headers first.");
  readEventRows_(sheet); // Validate headers before changing formatting.
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(text_);
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  function column(name) {
    return sheet.getRange(2, headers.indexOf(name) + 1, rows, 1);
  }
  function dropdown(name, options) {
    column(name).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(options, true)
        .setAllowInvalid(false)
        .build(),
    );
  }
  dropdown("event_type", [
    "Builder Night",
    "Social",
    "Dinner",
    "Speaker",
    "Workshop",
    "Trip",
    "Common Room",
    "Partner Event",
    "Office Hours",
    "Job Posting",
    "Other",
  ]);
  dropdown("status", [
    "Idea",
    "Planning",
    "Tentative",
    "Confirmed",
    "Published",
    "Completed",
    "Cancelled",
  ]);
  dropdown("visibility", ["Board Only", "YES", "Common Room", "Public"]);
  ["start_date", "end_date"].forEach(function (name) {
    column(name).setNumberFormat("yyyy-mm-dd");
  });
  ["start_time", "end_time"].forEach(function (name) {
    column(name).setNumberFormat("hh:mm");
  });
  column("featured").setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build(),
  );
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
}


const INVITATION_HEADERS = ["id", "event_id", "inviter_email", "guest_email", "created_at", "claimed_at", "enabled"];
function enabledMembers_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName("Access");
  if (!sheet) throw new Error("Missing Access tab.");
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(text_);
  ["email", "enabled"].forEach(function (name) {
    if (headers.indexOf(name) === -1 || headers.indexOf(name) !== headers.lastIndexOf(name))
      throw new Error("Missing or duplicate access headers.");
  });
  return values.slice(1).filter(function (row) {
    return enabled_(row[headers.indexOf("enabled")]);
  }).map(function (row) { return text_(row[headers.indexOf("email")]).toLowerCase(); });
}
function enabled_(value) { return value === true || text_(value) === "TRUE"; }
function inviteEmail_(value) {
  const email = text_(value).toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
function invitationRows_(spreadsheet, create) {
  let sheet = spreadsheet.getSheetByName("Invitations");
  if (!sheet && create) {
    sheet = spreadsheet.insertSheet("Invitations");
    sheet.getRange(1, 1, 1, INVITATION_HEADERS.length).setValues([INVITATION_HEADERS]);
    sheet.setFrozenRows(1);
  }
  if (!sheet) return { sheet: null, headers: INVITATION_HEADERS, rows: [] };
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(text_);
  INVITATION_HEADERS.forEach(function (name) {
    if (headers.indexOf(name) === -1 || headers.indexOf(name) !== headers.lastIndexOf(name))
      throw new Error("Missing or duplicate invitation headers.");
  });
  return { sheet: sheet, headers: headers, rows: values.slice(1).map(function (row, index) {
    const item = { rowNumber: index + 2 };
    INVITATION_HEADERS.forEach(function (name) { item[name] = row[headers.indexOf(name)]; });
    return item;
  }).filter(function (row) { return text_(row.id); }) };
}
function activeInviteEvents_(spreadsheet) {
  const entries = readEventRows_(spreadsheet.getSheetByName(CALENDAR_CONFIG.SHEET_NAME));
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const now = new Date();
  const today = Utilities.formatDate(now, timezone, "yyyy-MM-dd");
  const time = Utilities.formatDate(now, timezone, "HH:mm");
  return selectPublished_(entries).map(function (entry) {
    if (/^job postings?$/i.test(text_(entry.row.event_type))) return null;
    const id = text_(entry.row.id);
    // Ambiguous or missing IDs must never grant access to a different event.
    if (!id || id.length > 200 || entries.filter(function (e) { return text_(e.row.id) === id; }).length !== 1) return null;
    try {
      const event = toPublicEvent_(entry.row, timezone);
      return event.end_date > today || (event.end_date === today && (!event.end_time || event.end_time >= time)) ? event : null;
    } catch (_) { return null; }
  }).filter(Boolean);
}
function inviteLiteral_(value) {
  // Prevent spreadsheet formula execution in event IDs or email local parts.
  return typeof value === "string" && /^[=+@-]/.test(value) ? "'" + value : value;
}
function invitationResponse_(body) {
  let lock;
  try {
    const email = inviteEmail_(body.email);
    if (!email) return json_({ error: "invite_unavailable" });
    if (body.action !== "guest_access") {
      lock = LockService.getScriptLock();
      lock.waitLock(5000);
    }
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("Missing spreadsheet configuration.");
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const members = enabledMembers_(spreadsheet);
    const events = activeInviteEvents_(spreadsheet);
    const table = invitationRows_(spreadsheet, body.action === "invite_create" && members.indexOf(email) !== -1);
    if (body.action === "guest_access") {
      const ids = table.rows.filter(function (row) {
        return enabled_(row.enabled) && inviteEmail_(row.guest_email) === email &&
          members.indexOf(inviteEmail_(row.inviter_email)) !== -1 &&
          events.some(function (event) { return event.id === text_(row.event_id); });
      }).map(function (row) { return text_(row.event_id); });
      return json_({ eventIds: Array.from(new Set(ids)) });
    }
    if (body.action === "invite_create") {
      if (members.indexOf(email) === -1) return json_({ error: "members_only" });
      const event = events.find(function (event) { return event.id === body.eventId; });
      if (!event) return json_({ error: "event_unavailable" });
      const existing = table.rows.filter(function (row) {
        return inviteEmail_(row.inviter_email) === email && text_(row.event_id) === event.id;
      });
      if (existing.length > 1) throw new Error("Duplicate invitation rows.");
      if (existing.length) return enabled_(existing[0].enabled)
        ? json_({ id: text_(existing[0].id), claimed: Boolean(text_(existing[0].guest_email)) })
        : json_({ error: "invite_disabled" });
      if (typeof body.id !== "string" || !/^[a-f0-9]{32}$/.test(body.id) || table.rows.some(function (row) { return text_(row.id) === body.id; }))
        return json_({ error: "invite_unavailable" });
      const record = { id: body.id, event_id: event.id, inviter_email: email, guest_email: "",
        created_at: new Date().toISOString(), claimed_at: "", enabled: true };
      table.sheet.appendRow(table.headers.map(function (name) { return inviteLiteral_(record[name] === undefined ? "" : record[name]); }));
      return json_({ id: body.id, claimed: false });
    }
    if (typeof body.id !== "string" || !/^[a-f0-9]{32}$/.test(body.id)) return json_({ error: "invite_unavailable" });
    const matches = table.rows.filter(function (row) { return text_(row.id) === body.id; });
    if (matches.length !== 1) return json_({ error: "invite_unavailable" });
    const row = matches[0];
    if (!enabled_(row.enabled) || members.indexOf(inviteEmail_(row.inviter_email)) === -1)
      return json_({ error: "invite_unavailable" });
    if (!events.some(function (event) { return event.id === text_(row.event_id); })) return json_({ error: "event_unavailable" });
    if (inviteEmail_(row.inviter_email) === email) return json_({ error: "self_invite" });
    if (text_(row.guest_email) && inviteEmail_(row.guest_email) !== email) return json_({ error: "invite_claimed" });
    if (!text_(row.guest_email)) {
      // Both values are persisted in one write while holding the script-wide lock.
      const values = table.sheet.getRange(row.rowNumber, 1, 1, table.headers.length).getValues()[0];
      values[table.headers.indexOf("guest_email")] = inviteLiteral_(email);
      values[table.headers.indexOf("claimed_at")] = new Date().toISOString();
      table.sheet.getRange(row.rowNumber, 1, 1, table.headers.length).setValues([values.map(inviteLiteral_)]);
    }
    return json_({ eventId: text_(row.event_id) });
  } catch (_) {
    console.error("YES calendar: invitation lookup or update failed.");
    return json_({ error: "invitation_service_unavailable" });
  } finally {
    if (lock && lock.hasLock()) {
      try { SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
    }
  }
}
