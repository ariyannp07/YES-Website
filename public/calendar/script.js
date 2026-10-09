import {
  addDays,
  dateRange,
  formatDate,
  formatTime,
  isUpcoming,
  loadEvents,
  monthCells,
  occursOn,
  timeRange,
  zonedNow,
} from "./data.js";

import { googleCalendarURL, calendarICS } from "./calendar-links.js";

// Configure these once. Board members then maintain only the Google Sheet.
const CONFIG = {
  API_URL: "/api/calendar/events", // Same-origin, authenticated server route.
  TIME_ZONE: "America/New_York",
  REFRESH_MS: 5 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 20000,
};
// Programmatic dialog focus must remain visible for keyboard users, without
// drawing a selection ring after a pointer opens or dismisses a dialog.
document.addEventListener("pointerdown", () => {
  document.documentElement.dataset.inputModality = "pointer";
}, true);
document.addEventListener("keydown", (event) => {
  if (!event.metaKey && !event.ctrlKey && !event.altKey)
    document.documentElement.dataset.inputModality = "keyboard";
}, true);
const params = new URLSearchParams(location.search);
const state = {
  events: [],
  canInvite: false,
  timezone: CONFIG.TIME_ZONE,
  view: params.get("view") === "month" ? "month" : "agenda",
  type: params.get("type") || "All",
  month:
    /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get("month") || "") &&
    Number(params.get("month").slice(0, 4)) >= 1900 &&
    Number(params.get("month").slice(0, 4)) <= 9998
      ? params.get("month")
      : "",
  loading: false,
  loaded: false,
  error: "",
};
let openEventData = null;
let eventLinkOpened = false;
const $ = (id) => document.getElementById(id);
const now = () => zonedNow(state.timezone);
state.month ||= now().date.slice(0, 7);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
function writeURL() {
  const url = new URL(location.href);
  if (state.view === "month") url.searchParams.set("view", "month");
  else url.searchParams.delete("view");
  if (state.type !== "All") url.searchParams.set("type", state.type);
  else url.searchParams.delete("type");
  if (state.view === "month") url.searchParams.set("month", state.month);
  else url.searchParams.delete("month");
  history.replaceState(null, "", url);
}
function renderFilters() {
  const types = [
    "All",
    ...new Set(state.events.map((event) => event.event_type).sort()),
  ];
  if (!types.includes(state.type)) types.push(state.type);
  const activeType = document.activeElement?.dataset.type;
  $("filters").replaceChildren(
    ...types.map((type) => {
      const button = node("button", "", type);
      button.type = "button";
      button.dataset.type = type;
      button.setAttribute("aria-pressed", String(type === state.type));
      button.addEventListener("click", () => {
        state.type = type;
        writeURL();
        render();
      });
      return button;
    }),
  );
  if (activeType)
    [...$("filters").children]
      .find((button) => button.dataset.type === activeType)
      ?.focus();
}
function openEvent(event, trigger) {
  const detail = $("event-detail");
  const fragments = [];
  if (event.image_url) {
    const image = node("img", "detail-image");
    image.src = event.image_url;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.remove(), { once: true });
    fragments.push(image);
  }
  document.querySelector(".dialog-top .eyebrow").textContent = event.event_type;
  const title = node("h2", "", event.event_name);
  title.id = "detail-title";
  fragments.push(title);
  const facts = node("dl", "detail-facts");
  [
    ["When", dateRange(event)],
    [
      "Time",
      `${timeRange(event)}${event.start_time ? ` ${timezoneLabel()}` : ""}`,
    ],
    ["Where", event.location || "Location to be announced"],
  ].forEach(([label, value]) => {
    const row = node("div");
    row.append(node("dt", "", label), node("dd", "", value));
    facts.append(row);
  });
  fragments.push(facts);
  if (event.description)
    fragments.push(node("p", "detail-description", event.description));
  fragments.push(eventActionBar(event));
  detail.replaceChildren(...fragments);
  const dialog = $("event-dialog");
  openEventData = JSON.stringify(event);
  dialog.showModal();
  dialog.scrollTop = 0;
  $("close-dialog").focus({ preventScroll: true });
  dialog.onclose = () => {
    openEventData = null;
    hideEventPopovers();
    const replacement = [
      ...document.querySelectorAll(".event-row, .month-event"),
    ].find(
      (button) =>
        button.getAttribute("aria-label") ===
        trigger.getAttribute("aria-label"),
    );
    (trigger.isConnected ? trigger : replacement || $("events")).focus({ preventScroll: true });
  };
}
function eventButton(event, compact = false, day = "") {
  const button = node(
    "button",
    `${compact ? "month-event" : "event-row"}${event.featured ? " featured" : ""}`,
  );
  button.type = "button";
  button.setAttribute(
    "aria-label",
    `${event.event_name}, ${dateRange(event)}, ${timeRange(event)}${event.start_time ? ` ${timezoneLabel()}` : ""}. View details`,
  );
  button.addEventListener("click", () => openEvent(event, button));
  if (compact) {
    button.append(node("strong", "", event.event_name));
    button.append(
      node(
        "span",
        "",
        day > event.start_date
          ? "Continues"
          : event.start_time
            ? `${formatTime(event.start_time)} ${timezoneLabel()}`
            : "All day",
      ),
    );
    return button;
  }
  const date = node("span", "event-date");
  date.append(
    node("span", "day-number", String(Number(event.start_date.slice(8)))),
    node(
      "span",
      "day-name",
      formatDate(event.start_date, {
        weekday: "short",
        day: undefined,
        month: undefined,
      }),
    ),
  );
  const text = node("span", "event-body");
  const heading = node("span", "event-heading");
  heading.append(
    node("span", "event-title", event.event_name),
    node("span", "event-type", event.event_type),
  );
  text.append(heading);
  // Block spans keep the entire row one semantic button, without nested controls.
  const meta = node(
    "span",
    "event-meta",
    `${event.start_time ? `${formatTime(event.start_time)} ${timezoneLabel()}` : "All day"}${event.end_date !== event.start_date ? ` · Through ${formatDate(event.end_date, { month: "short" })}` : ""} · ${event.location || "Location to be announced"}`,
  );
  text.append(meta);
  const arrow = node("span", "event-arrow");
  arrow.append(actionIcon("forward"));
  button.append(
    date,
    text,
    arrow,
  );
  return button;
}
function renderAgenda(events) {
  const container = $("calendar-content");
  const groups = new Map();
  events
    .filter((event) => isUpcoming(event, now()))
    .forEach((event) => {
      const month = event.start_date.slice(0, 7);
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month).push(event);
    });
  for (const [month, entries] of groups) {
    const section = node("section", "agenda-group");
    const heading = node(
      "h2",
      "month-label",
      formatDate(`${month}-01`, {
        month: "long",
        year: "numeric",
        day: undefined,
      }),
    );
    section.append(heading, ...entries.map((event) => eventButton(event)));
    container.append(section);
  }
  return [...groups.values()].reduce(
    (count, entries) => count + entries.length,
    0,
  );
}
function renderMonth(events) {
  $("month-title").textContent = formatDate(`${state.month}-01`, {
    month: "long",
    year: "numeric",
    day: undefined,
  });
  $("previous-month").disabled = state.month === "1900-01";
  $("next-month").disabled = state.month === "9998-12";
  const wrapper = node("div", "month-scroll");
  const grid = node("div", "month-grid");
  grid.setAttribute("role", "table");
  grid.setAttribute("aria-label", $("month-title").textContent);
  const weekdays = node("div");
  weekdays.setAttribute("role", "row");
  weekdays.className = "month-week";
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    const cell = node("div", "weekday", day);
    cell.setAttribute("role", "columnheader");
    weekdays.append(cell);
  });
  grid.append(weekdays);
  const dates = monthCells(state.month);
  let week;
  dates.forEach((date, index) => {
    if (index % 7 === 0) {
      week = node("div");
      week.setAttribute("role", "row");
      week.className = "month-week";
      grid.append(week);
    }
    const cell = node(
      "div",
      `month-day${date.slice(0, 7) !== state.month ? " outside" : ""}${date === now().date ? " is-today" : ""}`,
    );
    cell.setAttribute("role", "cell");
    cell.setAttribute("aria-label", formatDate(date, { year: "numeric" }));
    const label = node("time", "date-label", String(Number(date.slice(8))));
    label.dateTime = date;
    if (date === now().date) label.setAttribute("aria-current", "date");
    cell.append(label);
    events
      .filter((event) => occursOn(event, date))
      .forEach((event) => cell.append(eventButton(event, true, date)));
    week.append(cell);
  });
  wrapper.append(grid);
  $("calendar-content").append(
    wrapper,
    node("p", "month-help", "Select an event for details."),
  );
  const end = addDays(`${state.month}-01`, 32).slice(0, 7) + "-01";
  return events.filter(
    (event) => event.start_date < end && occursInMonth(event, state.month),
  ).length;
}
function occursInMonth(event, month) {
  return monthCells(month).some(
    (date) => date.startsWith(month) && occursOn(event, date),
  );
}
function timezoneLabel() {
  return state.timezone === "America/New_York"
    ? "ET"
    : state.timezone.replaceAll("_", " ");
}
function render() {
  renderFilters();
  document
    .querySelectorAll("[data-view]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.view === state.view),
      ),
    );
  $("month-navigation").hidden = !state.loaded || state.view !== "month";
  document.querySelector(".filter-bar").hidden = !state.loaded || !state.events.length;
  if (!state.loaded) {
    $("status").dataset.state = state.error ? "error" : "loading";
    $("status").textContent = state.error || "Loading events…";
    $("status").setAttribute("role", state.error ? "alert" : "status");
    $("retry").hidden = !state.error;
    return;
  }
  $("calendar-context").textContent =
    state.view === "agenda" ? "Upcoming events" : "Monthly calendar";
  $("calendar-content").replaceChildren();
  const selected = state.events.filter(
    (event) => state.type === "All" || event.event_type === state.type,
  );
  const count =
    state.view === "agenda" ? renderAgenda(selected) : renderMonth(selected);
  $("event-count").textContent = `${count} ${count === 1 ? "event" : "events"}`;
  $("status").dataset.state = "empty";
  $("status").textContent = !count && state.view === "agenda"
    ? "No upcoming events."
    : "";
  $("retry").hidden = true;
  $("status").setAttribute("role", "status");
}
async function refresh() {
  if (state.loading) return;
  state.loading = true;
  if (!state.loaded) {
    state.error = "";
    render();
  }
  $("retry").disabled = true;
  $("calendar-content").setAttribute("aria-busy", "true");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
  try {
    const result = await loadEvents(CONFIG.API_URL, controller.signal);
    state.events = result.events;
    state.timezone = result.timezone;
    state.canInvite = result.canInvite;
    state.loaded = true;
    // Close a detail panel if its event has been removed or changed on refresh.
    if (
      $("event-dialog").open &&
      !state.events.some((event) => JSON.stringify(event) === openEventData)
    )
      $("event-dialog").close();
    render();
    const linkedEvent = params.get("event");
    if (linkedEvent && !eventLinkOpened) {
      eventLinkOpened = true;
      const event = state.events.find(event => event.id === linkedEvent);
      if (event) openEvent(event, $("events"));
    }
  } catch (error) {
    console.error("[YES calendar] Unable to load events:", error);
    // Never retain event details after access is revoked or cannot be verified.
    state.events = [];
    state.loaded = false;
    $("calendar-content").replaceChildren();
    $("event-count").textContent = "";
    if ($("event-dialog").open) $("event-dialog").close();
    $("event-detail").replaceChildren();
    if (error.name === "CalendarAccessError") {
      location.replace("/calendar/sign-in");
      return;
    }
    state.error = "The calendar is temporarily unavailable. Please try again.";
    render();
  } finally {
    clearTimeout(timer);
    state.loading = false;
    $("retry").disabled = false;
    $("calendar-content").setAttribute("aria-busy", "false");
  }
}
document.querySelectorAll("[data-view]").forEach((button) =>
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    writeURL();
    render();
  }),
);
function moveMonth(amount) {
  const [year, month] = state.month.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  state.month = date.toISOString().slice(0, 7);
  writeURL();
  render();
}
$("previous-month").addEventListener("click", () => moveMonth(-1));
$("next-month").addEventListener("click", () => moveMonth(1));
$("today").addEventListener("click", () => {
  state.month = now().date.slice(0, 7);
  writeURL();
  render();
});
$("retry").addEventListener("click", refresh);
$("close-dialog").addEventListener("click", () => $("event-dialog").close());
$("event-dialog").addEventListener("click", (event) => {
  if (event.target === $("event-dialog")) {
    const rect = event.target.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      event.target.close();
  }
});
window.addEventListener("popstate", () => {
  const query = new URLSearchParams(location.search);
  state.view = query.get("view") === "month" ? "month" : "agenda";
  state.type = query.get("type") || "All";
  const month = query.get("month");
  if (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(month || "") &&
    Number(month.slice(0, 4)) >= 1900 &&
    Number(month.slice(0, 4)) <= 9998
  )
    state.month = month;
  else state.month = now().date.slice(0, 7);
  render();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refresh();
});
setInterval(() => {
  if (!document.hidden) refresh();
}, CONFIG.REFRESH_MS);
refresh();

// BFCache can otherwise restore event DOM after sign-out in another tab.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});


function calendarActions(event) {
  const section = node("section", "event-popover");
  section.append(node("h3", "action-title", "Add to Calendar"));
  const actions = node("div", "calendar-options");
  try {
    const google = node("a", "calendar-option");
    const googleIcon = node("span", "option-icon google-icon", "G");
    googleIcon.setAttribute("aria-hidden", "true");
    google.append(googleIcon, node("span", "", "Google Calendar"), actionIcon("external"));
    google.href = googleCalendarURL(event, state.timezone);
    google.target = "_blank";
    google.rel = "noopener noreferrer";
    const apple = node("button", "calendar-option");
    const appleIcon = node("span", "option-icon");
    appleIcon.append(actionIcon("calendar"));
    apple.append(appleIcon, node("span", "", "Apple Calendar"), actionIcon("download"));
    apple.type = "button";
    // Generate before displaying the action so malformed dates get a useful message.
    const ics = calendarICS(event, state.timezone);
    apple.addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const download = document.createElement("a");
      download.href = url;
      download.download = (event.event_name.replace(/[^a-z0-9]+/gi, "-").slice(0, 80) || "yes-event") + ".ics";
      document.body.append(download);
      download.click();
      download.remove();
      section.hidePopover?.();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
    google.addEventListener("click", () => section.hidePopover?.());
    actions.append(google, apple);
    section.append(actions);
    if (event.start_time && !event.end_time)
      section.append(node("p", "action-note", "End time not set. Adjust the duration after adding."));
  } catch {
    section.append(node("p", "action-note", "Calendar export is unavailable for this event's time."));
  }
  return section;
}
function plusOneActions(event) {
  const section = node("section", "event-popover");
  section.append(node("h3", "action-title", "Bring a plus-one"));
  section.append(node("p", "action-note", "One guest · Google sign-in"));
  if (!event.id || state.events.filter(other => other.id === event.id).length !== 1) {
    section.append(node("p", "action-note", "Invitations aren't available for this event yet."));
    return section;
  }
  const create = node("button", "secondary-action", "Create invitation");
  create.type = "button";
  const status = node("p", "action-note");
  status.setAttribute("role", "status");
  const output = node("div", "invite-output");
  section.append(create, status, output);
  create.addEventListener("click", async () => {
    create.disabled = true;
    status.textContent = "Creating invitation…";
    try {
      const response = await fetch("/api/calendar/invites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ eventId: event.id }), signal: AbortSignal.timeout(20000),
      });
      if ([401, 403].includes(response.status)) { location.replace("/calendar/sign-in"); return; }
      const result = await response.json();
      if (!response.ok) {
        status.textContent = result.error === "event_unavailable" ? "This event is no longer accepting invitations."
          : result.error === "invite_disabled" ? "This invitation has been disabled."
          : "Unable to create an invitation. Please try again.";
        return;
      }
      const url = new URL(result.url);
      if (url.origin !== location.origin || url.pathname !== "/calendar/invite") throw new Error("Invalid invitation URL");
      create.hidden = true;
      if (result.claimed) {
        status.textContent = "Your plus-one has accepted.";
        return;
      }
      status.textContent = "Share with one person. The first account to accept claims it.";
      const input = node("input", "invite-link");
      input.type = "text";
      input.readOnly = true;
      input.value = url.href;
      input.setAttribute("aria-label", "Invitation link");
      input.addEventListener("focus", () => input.select());
      const actions = node("div", "action-links");
      const copy = node("button", "secondary-action", "Copy link");
      copy.type = "button";
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(url.href); copy.textContent = "Copied"; }
        catch { input.focus(); input.select(); status.textContent = "Copy the selected link."; }
      });
      const message = `Join me at ${event.event_name}. Sign in with Google to accept your invitation: ${url.href}`;
      const email = node("a", "secondary-action", "Email ↗");
      email.href = `mailto:?subject=${encodeURIComponent(`You're invited: ${event.event_name}`)}&body=${encodeURIComponent(message)}`;
      const messages = node("a", "secondary-action", "Messages ↗");
      messages.href = `sms:${/iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`;
      actions.append(copy, email, messages);
      if (navigator.share) {
        const share = node("button", "secondary-action", "Share…");
        share.type = "button";
        share.addEventListener("click", async () => {
          try { await navigator.share({ title: event.event_name, text: `Join me at ${event.event_name}.`, url: url.href }); }
          catch (error) { if (error.name !== "AbortError") status.textContent = "Use Email, Messages, or Copy link to share."; }
        });
        actions.append(share);
      }
      output.replaceChildren(input, actions);
      copy.focus({ preventScroll: true });
    } catch {
      status.textContent = "Unable to create an invitation. Please try again.";
    } finally {
      create.disabled = false;
    }
  });
  return section;
}


function actionIcon(name) {
  const paths = {
    calendar: "M8 3v4m8-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
    invite: "M14 4.5 21 11l-7 6.5V13c-5 0-8.2 2.1-11 6 1-7.5 4.8-10 11-10V4.5Z",
    chevron: "m8 10 4 4 4-4",
    forward: "m10 6 6 6-6 6",
    external: "M7 17 17 7M7 7h10v10",
    download: "M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4",
    close: "m7 7 10 10M17 7 7 17",
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[name]);
  svg.append(path);
  return svg;
}
function hideEventPopovers() {
  document.querySelectorAll(".event-popover").forEach(panel => {
    if (panel.matches(":popover-open")) panel.hidePopover();
  });
}
function eventActionBar(event) {
  const bar = node("div", "event-action-bar");
  if (event.rsvp_url) {
    const host = new URL(event.rsvp_url).hostname;
    const label = /(^|\.)(lu\.ma|luma\.com)$/.test(host) ? "Luma" : "RSVP";
    const luma = node("a", "luma-action", label === "Luma" ? "RSVP on Luma" : label);
    luma.href = event.rsvp_url;
    luma.target = "_blank";
    luma.rel = "noopener noreferrer";
    luma.setAttribute("aria-label", `${label} for ${event.event_name} (opens in a new tab)`);
    luma.append(actionIcon("external"));
    bar.append(luma);
  }
  const calendar = node("button", "calendar-trigger");
  calendar.type = "button";
  calendar.setAttribute("aria-label", "Add to Calendar");
  calendar.title = "Add to Calendar";
  calendar.append(actionIcon("calendar"));
  bar.append(calendar);
  attachEventPopover(bar, calendar, calendarActions(event), "calendar-options");
  if (state.canInvite && isUpcoming(event, now())) {
    const invite = node("button", "invite-trigger");
    invite.type = "button";
    invite.setAttribute("aria-label", "Bring a plus-one");
    invite.title = "Bring a plus-one";
    invite.append(actionIcon("invite"));
    bar.append(invite);
    attachEventPopover(bar, invite, plusOneActions(event), "plus-one-options");
  }
  return bar;
}
function attachEventPopover(bar, trigger, panel, id) {
  panel.id = id;
  panel.setAttribute("popover", "auto");
  panel.setAttribute("role", "region");
  const heading = panel.querySelector("h3");
  heading.id = `${id}-title`;
  panel.setAttribute("aria-labelledby", heading.id);
  const header = node("div", "popover-header");
  const close = node("button", "popover-close");
  close.type = "button";
  close.setAttribute("aria-label", `Close ${heading.textContent}`);
  close.append(actionIcon("close"));
  close.setAttribute("popovertarget", id);
  close.setAttribute("popovertargetaction", "hide");
  header.append(heading, close);
  panel.prepend(header);
  trigger.setAttribute("popovertarget", id);
  trigger.setAttribute("aria-controls", id);
  trigger.setAttribute("aria-expanded", "false");
  bar.append(panel);
  function place() {
    if (!panel.matches(":popover-open")) return;
    const anchor = trigger.getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    const preferredLeft = anchor.right - rect.width;
    const left = Math.max(16, Math.min(preferredLeft, innerWidth - rect.width - 16));
    const above = anchor.top - rect.height - 10;
    const top = above >= 16 ? above : Math.max(16, Math.min(anchor.bottom + 10, innerHeight - rect.height - 16));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }
  const resize = new ResizeObserver(place);
  panel.addEventListener("toggle", event => {
    const open = event.newState === "open";
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      place();
      resize.observe(panel);
      panel.querySelector(".calendar-option, .secondary-action")?.focus({ preventScroll: true });
    } else resize.disconnect();
  });
}
window.addEventListener("resize", hideEventPopovers);
$("event-dialog").addEventListener("scroll", hideEventPopovers);
