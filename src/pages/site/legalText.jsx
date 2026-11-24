import React from "react";

// Privacy Policy + Terms of Service. Bump LEGAL_VERSION (and TERMS_VERSION in biotrack-api/legal.js)
// for material changes: every user is asked to accept the new version.
export const LEGAL_VERSION = "2026-11-24";
export const EFFECTIVE = "November 24, 2026";
const A = ({ to }) => <a href={`mailto:${to}`} style={{ color: "#5468FF" }}>{to}</a>;
const L = ({ href, children }) => <a href={href} style={{ color: "#5468FF" }}>{children}</a>;

export function PrivacyText() {
  return (<>
    <p><b>Effective {EFFECTIVE}.</b> This policy explains what BodyData ("BodyData", "we", "us") collects, how we use it, who we share it with, and the choices you have. It covers the BodyData iPhone app, the web app at bodydata.ai and the BodyData Agent. It is also our Consumer Health Data Privacy Policy for the purposes of Washington's My Health My Data Act, Nevada's consumer health data law and similar laws.</p>
    <p><b>The short version:</b> you decide what health data to share with BodyData. We use it to run the service for you. We don't sell it, we don't use it for advertising, and you can export or permanently delete it at any time. Some of it is processed by the service providers listed below (for example our hosting and AI providers) so the service can work. By using BodyData you consent to this.</p>

    <h2>1. Data you choose to share</h2>
    <ul>
      <li><b>Health and fitness data:</b> what you allow BodyData to read from Apple Health (for example activity, workouts, heart rate, HRV, sleep, body measurements, nutrition, blood pressure, glucose and other categories you approve), data from services you connect (such as Withings or WHOOP), and files you upload or forward (such as lab results, DEXA, RMR or VO2 max reports, CSV or JSON exports and screenshots).</li>
      <li><b>Information you type in:</b> your profile and onboarding answers (for example sex, birth year, height, goals, diet and training), goals, alerts, custom metrics and sections, and what you ask Ask AI.</li>
      <li><b>Account information:</b> your email, name if you provide it, and sign-in details handled by our authentication provider.</li>
      <li><b>Feedback:</b> bug reports and feature requests, including any screenshot you attach, plus your app version and device model.</li>
      <li><b>Technical data:</b> server logs (such as IP address, request times and errors) and, if enabled, product analytics about which screens and features are used. Analytics never include your health values.</li>
    </ul>
    <p>Health data you share may reveal sensitive information, including information about your physical health, body, biometrics, fertility or medical conditions. Only share what you're comfortable sharing. You can stop at any time.</p>

    <h2>2. Your consent</h2>
    <p>Before you use BodyData we ask for your explicit consent to collect and process your health data as described here. Each additional source is your choice: you approve Apple Health categories on your iPhone, you connect each outside service, and you choose each file you upload. You can withdraw consent at any time by disconnecting a source, turning off Apple Health access in iOS Settings, or deleting your account (see section 9). Withdrawing consent doesn't affect processing that already happened.</p>

    <h2>3. How we use your data</h2>
    <ul>
      <li>To provide the service: syncing and storing your data, building your dashboards, metrics, comparisons and benchmarks, and running imports.</li>
      <li>To run the features you turn on or ask for: Ask AI, calculated metrics, alerts, goals, weekly reviews and notifications.</li>
      <li>To support you, fix bugs, keep the service secure and prevent abuse.</li>
      <li>To comply with the law and enforce our Terms.</li>
    </ul>
    <p>We <b>do not sell</b> your personal data or health data. We <b>do not use</b> it for advertising or marketing, or share it with data brokers or advertisers. We don't use your health data to train AI models. Benchmarks compare you with published reference data; your data counts toward member statistics only if you opt in, and then only in aggregated form that doesn't identify you.</p>

    <h2>4. Apple Health (HealthKit)</h2>
    <p>BodyData only reads from Apple Health; it never writes to or changes your Health data. Data from Apple Health is used only to provide BodyData's health and fitness features to you. It is never used for advertising or data mining, never sold, and never shared with third parties except the service providers who help us run BodyData (section 5) or with your direct permission.</p>

    <h2>5. Who we share data with</h2>
    <p>We share data only as needed to run BodyData, with service providers that process it on our behalf under contract:</p>
    <ul>
      <li><b>Hosting and database</b> (Railway): stores your account and data and runs our servers.</li>
      <li><b>Website hosting</b> (Vercel): serves the bodydata.ai website and web app.</li>
      <li><b>AI provider</b> (Anthropic): when you use Ask AI, weekly reviews, file imports or other AI features, the relevant parts of your data and your question are sent to our AI provider to produce the result. Under its commercial terms, our AI provider doesn't use this data to train its models.</li>
      <li><b>Web search:</b> when Ask AI researches a question, the search terms it writes are sent to a search provider through our AI provider. They don't include your name or email.</li>
      <li><b>Push notifications</b> (ntfy and Apple Push Notification service): if you turn on notifications, their text (which can include a short summary of your numbers) passes through these services to reach your device.</li>
      <li><b>Authentication and analytics providers</b>, if used, receive account and usage data only, never your health values.</li>
      <li><b>Services you connect</b> (for example Withings or WHOOP): we receive data from them when you connect them, and their own privacy policies apply to what they collect.</li>
    </ul>
    <p>We may also disclose data if required by law or valid legal process, to protect the rights, safety or security of users or others, or in connection with a merger, acquisition or sale of assets. If a sale happens, we will tell you, and this policy (or one at least as protective) will continue to apply to your data.</p>

    <h2>6. AI features</h2>
    <p>AI-generated answers, reviews and calculations can be incomplete or wrong. They are for general information, not medical advice (see our <L href="/terms">Terms</L>). Check anything important with a qualified professional.</p>

    <h2>7. Security</h2>
    <p>All connections to BodyData use encryption in transit (TLS). Data is stored in access-controlled databases, every device and script uses its own revocable access key, and connected-service tokens are never shown to apps or included in exports. No system is perfectly secure, however, and we can't guarantee that data won't be accessed, disclosed, altered or lost through a breach or failure. If a breach affecting your data occurs, we will notify you and the authorities as required by law.</p>

    <h2>8. Retention</h2>
    <p>We keep your data while your account is open so the service can show your full history. When you delete data or your account, it is removed from our active systems right away. Copies in backups are deleted as those backups expire, normally within 90 days. Server logs are kept for a limited time for security and troubleshooting.</p>

    <h2>9. Your rights and choices</h2>
    <ul>
      <li><b>Access and export:</b> download all your data at any time from the app (Export).</li>
      <li><b>Delete:</b> permanently delete your account and all its data in the app (More → Delete account on iPhone; Profile → Delete account on the web), or by emailing us.</li>
      <li><b>Correct:</b> edit or delete data, sections and settings in the app, or ask us.</li>
      <li><b>Withdraw consent and disconnect:</b> disconnect any service or revoke Apple Health access at any time.</li>
      <li><b>Appeal:</b> if we deny a request, reply to our response to appeal. If the appeal is denied you can contact your state attorney general.</li>
    </ul>
    <p>Depending on where you live (for example California, Washington, Nevada, Colorado, Connecticut, Virginia or Texas) you may have these and other rights under state law, including the right to know which third parties received your data. Email <A to="privacy@bodydata.ai"/>; we'll verify the request comes from you and reply within 45 days. We won't discriminate against you for using your rights.</p>

    <h2>10. Eligibility and location</h2>
    <p>BodyData is for adults 18 and older in the United States. We don't knowingly collect data from anyone under 18. If you think a minor has given us data, contact us and we'll delete it. Your data is stored and processed in the United States.</p>

    <h2>11. Not covered by HIPAA</h2>
    <p>BodyData isn't a healthcare provider, and is not a covered entity or business associate under HIPAA. Health information you share with BodyData isn't protected by HIPAA. It is protected by this policy and the laws that apply to consumer health data.</p>

    <h2>12. Changes</h2>
    <p>We'll post updates here with a new effective date. For material changes we'll notify you in the app and ask for your consent again before the change applies to you.</p>

    <h2>13. Contact</h2>
    <p>Privacy questions or requests: <A to="privacy@bodydata.ai"/>. Everything else: <A to="hello@bodydata.ai"/>.</p>
  </>);
}

export function TermsText() {
  return (<>
    <p><b>Effective {EFFECTIVE}.</b> These Terms of Service ("Terms") are an agreement between you and BodyData ("BodyData", "we", "us") covering the BodyData iPhone app, the web app at bodydata.ai, the BodyData Agent and related services (the "Service"). By creating an account or using the Service you agree to these Terms and to our <L href="/privacy">Privacy Policy</L>. If you don't agree, don't use the Service.</p>
    <p><b>Please read section 14:</b> it requires disputes to be resolved by individual arbitration and waives class actions, unless you opt out.</p>

    <h2>1. Eligibility</h2>
    <p>You must be at least 18, live in the United States, and be able to form a binding contract. You may only use the Service for your own data.</p>

    <h2>2. Not medical advice</h2>
    <p><b>BodyData is not a medical device and does not provide medical advice, diagnosis or treatment.</b> Dashboards, metrics, benchmarks, alerts, goals, weekly reviews and AI answers are for general information and personal tracking only. They aren't a substitute for a doctor, dietitian or other qualified professional, and no doctor–patient or other professional relationship is created. Always talk to a qualified professional before changing your diet, exercise, sleep, supplements or medication, or if you have questions about a medical condition. Never ignore or delay professional advice because of something in BodyData. <b>If you think you may have a medical emergency, call 911 or your local emergency number right away.</b></p>

    <h2>3. Accuracy of data and AI</h2>
    <p>The Service shows data that comes from you, your devices and third-party services. That data may be incomplete, delayed, duplicated or inaccurate (for example, different devices measure body fat or sleep differently), and imports and calculations can contain errors. AI features can produce answers that are wrong, incomplete or out of date. You're responsible for how you use any information from the Service. Check anything important before relying on it.</p>

    <h2>4. Your data and your choices</h2>
    <p>You own the data you share with BodyData. You decide what to connect, sync, upload or type in, and you're solely responsible for that choice and for having the right to share it. Don't upload anyone else's personal or health data without their permission. You give us a limited license to host, copy, process, transmit and display your data only to provide and improve the Service for you and as described in the Privacy Policy, including through our service providers such as hosting and AI providers. You can export or delete your data at any time.</p>

    <h2>5. Sharing is at your own risk</h2>
    <p>You understand and accept that:</p>
    <ul>
      <li>sending data over the internet and storing it with online services is never completely secure;</li>
      <li>your data will be processed by the third-party service providers described in the Privacy Policy;</li>
      <li>services you connect (Apple Health, Withings, WHOOP and others) are run by their own companies under their own terms, and we're not responsible for them or the data they provide; and</li>
      <li>if you share, export, forward or publish your data or reports outside BodyData, you're responsible for that and for whoever receives it.</li>
    </ul>
    <p>To the fullest extent allowed by law, you use the Service and share your data <b>at your own risk</b>.</p>

    <h2>6. Beta service</h2>
    <p>BodyData is in beta. Features may change, break, be limited or be removed at any time, and the Service may be unavailable or lose data. Keep your own copies of anything important (your Apple Health data stays on your iPhone, and you can export from BodyData at any time).</p>

    <h2>7. Free beta, AI allowance and credits</h2>
    <p>The Service is free during the beta. Each account gets a monthly allowance of AI usage, currently $1 of AI per calendar month, which resets on the 1st. AI usage beyond the allowance needs credits. Credits have no cash value, can't be transferred, may expire when the beta ends, and are non-refundable except where the law requires. Dashboards, syncing and imports keep working when your AI allowance runs out. We may introduce paid plans or change the allowance; we'll tell you before any charge applies, and you won't be charged without agreeing to it.</p>

    <h2>8. Your account</h2>
    <p>Keep your sign-in details and access keys secure, and tell us right away if you think someone else has accessed your account. You're responsible for activity in your account.</p>

    <h2>9. Acceptable use</h2>
    <p>Don't: access or try to access other people's accounts or data; probe, scan, overload or disrupt the Service; reverse engineer it except where the law allows; use it to break any law or anyone's rights; scrape it or resell it; upload malware; or use it to build a competing product.</p>

    <h2>10. Feedback</h2>
    <p>If you send us ideas, feature requests or bug reports, we may use them freely without any obligation to you.</p>

    <h2>11. Our property</h2>
    <p>The Service, including its software, design and content (but not your data), belongs to BodyData and its licensors. We give you a personal, revocable, non-transferable license to use it under these Terms.</p>

    <h2>12. Disclaimer of warranties</h2>
    <p style={{ textTransform: "uppercase", fontSize: 14 }}>To the fullest extent permitted by law, the Service is provided "as is" and "as available", without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, non-infringement and uninterrupted or error-free operation. We do not warrant that the Service, its data, calculations or AI output are accurate, complete, reliable or secure.</p>

    <h2>13. Limitation of liability</h2>
    <p style={{ textTransform: "uppercase", fontSize: 14 }}>To the fullest extent permitted by law, BodyData and its owners, employees and service providers will not be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of data, health outcomes, personal injury arising from reliance on the Service, profits or goodwill, arising from or relating to the Service or these Terms, even if advised of the possibility. Our total liability for all claims relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim or US $50.</p>
    <p>Some places don't allow certain exclusions or limits, so some of the above may not apply to you. Nothing in these Terms limits liability that can't be limited by law, such as liability for gross negligence, willful misconduct or fraud.</p>

    <h2>Indemnity</h2>
    <p>To the extent allowed by law, you'll defend and indemnify BodyData against claims, losses and costs (including reasonable legal fees) arising from your misuse of the Service, your breach of these Terms, or data you shared without the right to.</p>

    <h2>14. Disputes: arbitration and class action waiver</h2>
    <p><b>Informal resolution first.</b> Before filing a claim, email <A to="hello@bodydata.ai"/> with a description of the dispute, and we'll both try in good faith to resolve it within 60 days.</p>
    <p><b>Binding individual arbitration.</b> If we can't resolve it, you and BodyData agree that any dispute arising from or relating to the Service or these Terms will be resolved by binding individual arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, rather than in court. Either of us may instead bring an individual claim in small claims court. The Federal Arbitration Act governs this section.</p>
    <p><b>No class actions.</b> Claims may only be brought individually, not as a plaintiff or class member in any class, collective or representative proceeding, and an arbitrator may not combine claims of more than one person.</p>
    <p><b>Opt out.</b> You can opt out of this arbitration agreement by emailing <A to="hello@bodydata.ai"/> within 30 days of first accepting these Terms, with your name, account email and a statement that you opt out of arbitration.</p>

    <h2>15. Ending your use</h2>
    <p>You can stop using the Service and delete your account at any time. We may suspend or end your access if you break these Terms, if needed to protect the Service or others, or if we discontinue the Service; where reasonable we'll give notice so you can export your data. Sections 2–5 and 10–17 survive termination.</p>

    <h2>16. Changes to these Terms</h2>
    <p>We may update these Terms. For material changes we'll notify you in the app and ask you to accept the new version; if you don't accept, you can stop using the Service and delete your account.</p>

    <h2>17. General</h2>
    <p>These Terms and the Privacy Policy are the entire agreement between you and BodyData about the Service. Apart from section 14, they are governed by the laws of the United States and the state where BodyData is established, without regard to conflict-of-law rules. If any part is unenforceable, the rest stays in effect. If we don't enforce a right, that isn't a waiver. You may not transfer these Terms; we may transfer them in connection with a merger, acquisition or sale of assets.</p>
    <p><b>Apple.</b> If you use the iPhone app, these Terms are between you and BodyData, not Apple. Apple isn't responsible for the app, its content, maintenance, support, warranties or any claims about it. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them. You also agree to the App Store's usage rules.</p>

    <h2>Contact</h2>
    <p><A to="hello@bodydata.ai"/></p>
  </>);
}
