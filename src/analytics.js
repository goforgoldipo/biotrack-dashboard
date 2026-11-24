// Product analytics (PostHog). Events describe what people do — never health values.
// Set VITE_POSTHOG_KEY in Vercel to switch it on; without it every call is a no-op.
import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
let on = false;

export function initAnalytics() {
  if (!KEY || on || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,              // clicks can carry on-screen numbers: we send explicit events only
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: true, // the dashboard shows health data: never record it
    mask_all_text: true,
    mask_all_element_attributes: true,
    persistence: "localStorage+cookie",
    person_profiles: "identified_only",
  });
  posthog.identify("owner");         // becomes the account id once sign-in ships
  on = true;
}
export const track = (event, props = {}) => { if (on) posthog.capture(event, props); };
export const screen = (name) => { if (on) posthog.capture("$screen", { $screen_name: name, platform: "web" }); };
