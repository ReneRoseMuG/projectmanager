# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\browser\web\start-page.spec.ts >> Startseite >> speichert über den Toggle ein persönliches Startseiten-Dashboard
- Location: tests\browser\web\start-page.spec.ts:34:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  11  | export function todayIsoDate(date = new Date()) {
  12  |   const year = date.getFullYear();
  13  |   const month = String(date.getMonth() + 1).padStart(2, "0");
  14  |   const day = String(date.getDate()).padStart(2, "0");
  15  |   return `${year}-${month}-${day}`;
  16  | }
  17  | 
  18  | export interface ProjectFixture {
  19  |   id: number;
  20  |   name: string;
  21  | }
  22  | 
  23  | export interface FeatureFixture {
  24  |   id: number;
  25  |   title: string;
  26  | }
  27  | 
  28  | export interface MilestoneFixture {
  29  |   id: number;
  30  |   projectId: number;
  31  |   name: string;
  32  |   version: number;
  33  | }
  34  | 
  35  | export interface UseCaseFixture {
  36  |   id: number;
  37  |   title: string;
  38  |   featureId: number;
  39  | }
  40  | 
  41  | export interface TaskFixture {
  42  |   id: number;
  43  |   title: string;
  44  | }
  45  | 
  46  | export interface TicketFixture {
  47  |   id: number;
  48  |   title: string;
  49  | }
  50  | 
  51  | export interface EventFixture {
  52  |   id: number;
  53  |   title: string;
  54  |   version: number;
  55  |   owners: Array<{ type: "project" | "milestone" | "task"; id: number }>;
  56  | }
  57  | 
  58  | export interface BacklogItemFixture {
  59  |   id: number;
  60  |   title: string;
  61  |   projectId: number;
  62  | }
  63  | 
  64  | export type TaskOwner = {
  65  |   type: "project" | "milestone" | "feature" | "useCase";
  66  |   id: number;
  67  | };
  68  | export type TicketOwner = {
  69  |   type: "project" | "milestone" | "task" | "feature" | "useCase";
  70  |   id: number;
  71  | };
  72  | 
  73  | export function uniqueTitle(prefix: string) {
  74  |   return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
  75  | }
  76  | 
  77  | export function safeFilename(value: string) {
  78  |   return value
  79  |     .toLocaleLowerCase("de-DE")
  80  |     .replace(/[^a-z0-9]+/g, "-")
  81  |     .replace(/^-|-$/g, "");
  82  | }
  83  | 
  84  | export function pathWithOptionalQuery(path: string) {
  85  |   const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  86  |   return new RegExp(`${escapedPath}(?:\\?.*)?$`);
  87  | }
  88  | 
  89  | export async function expectToast(page: Page, text: string) {
  90  |   await expect(page.locator('[role="status"][aria-live="polite"]')).toContainText(
  91  |     text,
  92  |   );
  93  | }
  94  | 
  95  | const authenticatedApiRequests = new WeakSet<APIRequestContext>();
  96  | const authenticatedPages = new WeakSet<Page>();
  97  | 
  98  | export async function ensureApiAuth(request: APIRequestContext) {
  99  |   if (authenticatedApiRequests.has(request)) {
  100 |     return;
  101 |   }
  102 |   const response = await request.post(`${apiBaseUrl}/auth/login`, {
  103 |     data: { email: "admin@local", password: "password123" },
  104 |   });
  105 |   expect(response.ok()).toBeTruthy();
  106 |   authenticatedApiRequests.add(request);
  107 | }
  108 | 
  109 | export async function authenticatedGoto(page: Page, path: string) {
  110 |   if (!authenticatedPages.has(page)) {
> 111 |     await page.goto("/login");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  112 |     await page.getByLabel("E-Mail").fill("admin@local");
  113 |     await page.getByLabel("Passwort").fill("password123");
  114 |     await page.getByRole("button", { name: "Anmelden" }).click();
  115 |     await expect(
  116 |       page.getByRole("heading", { name: "Startseite", exact: true }),
  117 |     ).toBeVisible();
  118 |     authenticatedPages.add(page);
  119 |   }
  120 |   await page.goto(path);
  121 | }
  122 | 
  123 | function taskOwnerPath(owner: TaskOwner) {
  124 |   if (owner.type === "project") {
  125 |     return `projects/${owner.id}`;
  126 |   }
  127 |   if (owner.type === "milestone") {
  128 |     return `milestones/${owner.id}`;
  129 |   }
  130 |   if (owner.type === "feature") {
  131 |     return `features/${owner.id}`;
  132 |   }
  133 |   return `use-cases/${owner.id}`;
  134 | }
  135 | 
  136 | function ticketOwnerPath(owner: TicketOwner) {
  137 |   if (owner.type === "project") {
  138 |     return `projects/${owner.id}`;
  139 |   }
  140 |   if (owner.type === "milestone") {
  141 |     return `milestones/${owner.id}`;
  142 |   }
  143 |   if (owner.type === "task") {
  144 |     return `tasks/${owner.id}`;
  145 |   }
  146 |   if (owner.type === "feature") {
  147 |     return `features/${owner.id}`;
  148 |   }
  149 |   return `use-cases/${owner.id}`;
  150 | }
  151 | 
  152 | export async function createProject(
  153 |   request: APIRequestContext,
  154 |   titlePrefix: string,
  155 |   input: Partial<{
  156 |     description: string;
  157 |     status: string;
  158 |     color: string;
  159 |     startDate: string;
  160 |     dueDate: string;
  161 |   }> = {},
  162 | ) {
  163 |   await ensureApiAuth(request);
  164 |   const name = uniqueTitle(titlePrefix);
  165 |   const response = await request.post(`${apiBaseUrl}/projects`, {
  166 |     data: {
  167 |       name,
  168 |       description:
  169 |         input.description ?? "<p>E2E Projektbeschreibung vollständig</p>",
  170 |       ...(input.status !== undefined ? { status: input.status } : {}),
  171 |       color: input.color ?? "#4682B4",
  172 |       startDate: input.startDate ?? "2026-05-01",
  173 |       dueDate: input.dueDate ?? "2026-05-31",
  174 |     },
  175 |   });
  176 |   expect(response.ok()).toBeTruthy();
  177 |   return response.json() as Promise<ProjectFixture>;
  178 | }
  179 | 
  180 | export async function createMilestone(
  181 |   request: APIRequestContext,
  182 |   projectId: number,
  183 |   titlePrefix: string,
  184 |   input: Partial<{
  185 |     description: string;
  186 |     status: string;
  187 |     color: string;
  188 |     startDate: string;
  189 |     dueDate: string;
  190 |   }> = {},
  191 | ) {
  192 |   await ensureApiAuth(request);
  193 |   const name = uniqueTitle(titlePrefix);
  194 |   const response = await request.post(`${apiBaseUrl}/milestones`, {
  195 |     data: {
  196 |       projectId,
  197 |       name,
  198 |       description:
  199 |         input.description ?? "<p>E2E Meilensteinbeschreibung vollständig</p>",
  200 |       ...(input.status !== undefined ? { status: input.status } : {}),
  201 |       color: input.color ?? "#14B8A6",
  202 |       startDate: input.startDate ?? "2026-06-01",
  203 |       dueDate: input.dueDate ?? "2026-06-30",
  204 |     },
  205 |   });
  206 |   expect(response.ok()).toBeTruthy();
  207 |   return response.json() as Promise<MilestoneFixture>;
  208 | }
  209 | 
  210 | export async function createFeature(
  211 |   request: APIRequestContext,
```