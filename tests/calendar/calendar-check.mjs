import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const data = await import(
  `data:text/javascript;base64,${Buffer.from(readFileSync(new URL("../../public/calendar/data.js", import.meta.url), "utf8")).toString("base64")}`
);
const base = {
  id: "one",
  event_name: "Builder Night",
  event_type: "Builder Night",
  start_date: "2026-10-14",
  start_time: "21:00",
  end_time: "01:00",
  status: "Published",
  visibility: "Public",
};
function apiContext(rows = [base], headers) {
  const context = {
    console: { warn() {}, error() {} },
    Date,
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(text) {
        return {
          text,
          setMimeType(type) {
            this.type = type;
            return this;
          },
        };
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            return name === "SPREADSHEET_ID"
              ? "private-sheet-id"
              : "test-backend-secret-at-least-32-characters";
          },
        };
      },
    },
    Utilities: {
      formatDate(date, tz, pattern) {
        const p = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).formatToParts(date);
        const get = (type) => p.find((p) => p.type === type).value;
        return pattern === "yyyy-MM-dd"
          ? `${get("year")}-${get("month")}-${get("day")}`
          : `${get("hour")}:${get("minute")}`;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    readFileSync(
      new URL("../../docs/calendar/Code.gs", import.meta.url),
      "utf8",
    ),
    context,
  );
  const fields = headers || vm.runInContext("CALENDAR_CONFIG.HEADERS", context);
  context.SpreadsheetApp = {
    openById() {
      return {
        getSpreadsheetTimeZone() {
          return "America/New_York";
        },
        getSheetByName() {
          return {
            getDataRange() {
              return {
                getValues() {
                  return [
                    fields,
                    ...rows.map((row) =>
                      fields.map((field) => row[field] ?? ""),
                    ),
                  ];
                },
              };
            },
          };
        },
      };
    },
  };
  const originalGet = context.doGet;
  context.anonymousGet = originalGet;
  context.doGet = () =>
    context.doPost({
      postData: {
        contents: JSON.stringify({
          secret: "test-backend-secret-at-least-32-characters",
          action: "events",
        }),
      },
    });
  return context;
}
test("both layers exclude all private or nonpublished rows; query parameters cannot bypass", () => {
  const rows = [
    "Idea",
    "Planning",
    "Tentative",
    "Confirmed",
    "Completed",
    "Cancelled",
    "published",
    "Published ",
  ].map((status) => ({ ...base, status }));
  rows.push(
    ...["Board Only", "", "Unknown"].map((visibility) => ({
      ...base,
      visibility,
    })),
    { ...base, event_name: "" },
    base,
    { ...base, visibility: "YES" },
    { ...base, visibility: "Common Room" },
  );
  assert.equal(data.normalizeEvents(rows).length, 3);
  assert.equal(
    JSON.parse(
      apiContext(rows).doGet({ parameter: { all: "true", status: "Planning" } })
        .text,
    ).events.length,
    3,
  );
});
test("public projection contains no private fields or metadata", () => {
  const result = apiContext([
    {
      ...base,
      owner: "PRIVATE OWNER",
      notes: "PRIVATE NOTES",
      secret: "PRIVATE",
    },
  ]).doGet();
  assert.equal(result.type, "application/json");
  assert.ok(
    !/PRIVATE|private-sheet-id|rowNumber|owner|notes/.test(result.text),
  );
  assert.equal(
    JSON.parse(result.text).events[0].start_at,
    "2026-10-14T21:00:00",
  );
});
test("both layers roll overnight events into the next day", () => {
  const event = data.normalizeEvents([base])[0];
  assert.equal(event.end_date, "2026-10-15");
  assert.equal(data.occursOn(event, "2026-10-15"), true);
  assert.equal(
    JSON.parse(apiContext().doGet().text).events[0].end_date,
    "2026-10-15",
  );
});
test("all-day end date is inclusive; timed midnight is exclusive", () => {
  const event = data.normalizeEvents([
    { ...base, start_time: "", end_time: "", end_date: "2026-10-16" },
  ])[0];
  assert.equal(data.timeRange(event), "All day");
  assert.equal(data.occursOn(event, "2026-10-16"), true);
  assert.equal(data.occursOn(event, "2026-10-17"), false);
  assert.equal(
    data.occursOn(
      data.normalizeEvents([{ ...base, end_time: "00:00" }])[0],
      "2026-10-15",
    ),
    false,
  );
});
test("upcoming respects explicit end times and retains unknown end times through the day", () => {
  assert.equal(
    data.isUpcoming(data.normalizeEvents([{ ...base, end_time: "" }])[0], {
      date: "2026-10-14",
      time: "23:59",
    }),
    true,
  );
  const event = data.normalizeEvents([base])[0];
  assert.equal(
    data.isUpcoming(event, { date: "2026-10-15", time: "00:30" }),
    true,
  );
  assert.equal(
    data.isUpcoming(event, { date: "2026-10-15", time: "02:00" }),
    false,
  );
});
test("invalid dates, time-only endings, and backwards ranges fail closed", () => {
  assert.equal(data.validDate("2026-02-29"), false);
  assert.equal(data.validDate("2028-02-29"), true);
  const rows = [
    { ...base, start_date: "2026-02-30" },
    { ...base, end_date: "2026-10-13" },
    { ...base, end_date: "2026-10-14" },
    { ...base, start_time: "25:00" },
    { ...base, start_time: "", end_time: "01:00" },
  ];
  assert.equal(JSON.parse(apiContext(rows).doGet().text).events.length, 0);
  assert.equal(data.normalizeEvents(rows).length, 0);
});
test("native Sheet dates/times and numeric midnight serialize in the Sheet timezone", () => {
  const event = JSON.parse(
    apiContext([
      {
        ...base,
        start_date: new Date("2026-10-15T02:00:00Z"),
        start_time: new Date("2026-10-15T01:00:00Z"),
        end_time: 0,
      },
    ]).doGet().text,
  ).events[0];
  assert.equal(event.start_date, "2026-10-14");
  assert.equal(event.start_time, "21:00");
  assert.equal(event.end_time, "00:00");
});
test("missing and duplicate headers return generic errors", () => {
  assert.equal(
    JSON.parse(apiContext([], ["event_name"]).doGet().text).error,
    "calendar_unavailable",
  );
  const headers = vm.runInContext("CALENDAR_CONFIG.HEADERS", apiContext());
  assert.equal(
    JSON.parse(apiContext([], [...headers, "status"]).doGet().text).error,
    "calendar_unavailable",
  );
});
test("New York clock honors DST and differs from UTC calendar date", () => {
  assert.deepEqual(
    data.zonedNow("America/New_York", new Date("2026-10-15T02:00:00Z")),
    { date: "2026-10-14", time: "22:00" },
  );
  assert.deepEqual(
    data.zonedNow("America/New_York", new Date("2026-03-08T07:30:00Z")),
    { date: "2026-03-08", time: "03:30" },
  );
  assert.deepEqual(
    data.zonedNow("America/New_York", new Date("2026-11-01T06:30:00Z")),
    { date: "2026-11-01", time: "01:30" },
  );
});
test("civil calendar arithmetic handles leap days, years, and six-week months", () => {
  assert.equal(data.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(data.addDays("2026-12-31", 1), "2027-01-01");
  const cells = data.monthCells("2026-08");
  assert.equal(cells.length, 42);
  assert.equal(cells[0], "2026-07-26");
  assert.equal(cells.at(-1), "2026-09-05");
});
test("natural date ranges and strict featured booleans", () => {
  assert.equal(
    data.timeRange({
      ...base,
      end_date: base.start_date,
      start_time: "19:00",
      end_time: "21:00",
    }),
    "7:00–9:00 PM",
  );
  assert.equal(
    data.dateRange({
      ...base,
      start_date: "2026-11-06",
      end_date: "2026-11-08",
    }),
    "November 6–8, 2026",
  );
  assert.deepEqual(
    data
      .normalizeEvents([
        { ...base, featured: "FALSE" },
        { ...base, featured: "TRUE" },
        { ...base, featured: true },
      ])
      .map((x) => x.featured),
    [false, true, true],
  );
});
test("unsafe URL protocols are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com",
    "not a url",
  ])
    assert.equal(data.safeURL(url), "");
  assert.equal(data.safeURL("https://lu.ma/test"), "https://lu.ma/test");
});
test("eight sample events have no private fields", () => {
  const payload = JSON.parse(
    readFileSync(
      new URL("../../docs/calendar/sample-events.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(data.normalizeEvents(payload.events).length, 8);
  assert.ok(
    payload.events.every((event) => !("owner" in event) && !("notes" in event)),
  );
});
test("API loader handles HTTP failure, API errors, invalid shape, and success", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("{}", { status: 503 });
    await assert.rejects(data.loadEvents("https://example.test"), /503/);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "calendar_unavailable" }));
    await assert.rejects(
      data.loadEvents("https://example.test"),
      /calendar_unavailable/,
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ timezone: "America/New_York", events: {} }),
      );
    await assert.rejects(
      data.loadEvents("https://example.test"),
      /events array/,
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ timezone: "America/New_York", events: [base] }),
      );
    assert.equal(
      (await data.loadEvents("https://example.test")).events.length,
      1,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("Apps Script rejects direct GET, missing credentials, wrong secrets, and unknown actions", () => {
  const api = apiContext();
  assert.equal(JSON.parse(api.anonymousGet().text).error, "unauthorized");
  assert.equal(JSON.parse(api.doPost({}).text).error, "unauthorized");
  assert.equal(
    JSON.parse(
      api.doPost({
        postData: {
          contents: JSON.stringify({ secret: "wrong", action: "events" }),
        },
      }).text,
    ).error,
    "unauthorized",
  );
  assert.equal(
    JSON.parse(
      api.doPost({
        postData: {
          contents: JSON.stringify({
            secret: "test-backend-secret-at-least-32-characters",
            action: "all",
          }),
        },
      }).text,
    ).error,
    "invalid_action",
  );
});

test("Sheet access requires an exact active email and never returns the whitelist", () => {
  const api = apiContext(
    [
      { email: "Member@Yale.edu", enabled: true },
      { email: "revoked@yale.edu", enabled: false },
    ],
    ["email", "enabled"],
  );
  const check = (email) =>
    JSON.parse(
      api.doPost({
        postData: {
          contents: JSON.stringify({
            secret: "test-backend-secret-at-least-32-characters",
            action: "access",
            email,
          }),
        },
      }).text,
    );
  assert.deepEqual(check("member@yale.edu"), { allowed: true });
  assert.deepEqual(check("revoked@yale.edu"), { allowed: false });
  assert.deepEqual(check("stranger@yale.edu"), { allowed: false });
});
