# Editor guide (plain language)
Sign in at **/admin**. You only see what your role allows. Every change is saved as a version and recorded in the audit log.

**Preview:** every item has a **Preview** button (top right). It opens the page as residents would see it, with a
"Preview — not visible to the public" banner. Only signed-in staff can open previews, and only for items they may read.

**"Before publishing" panel:** the right-hand column warns when an item has no source linked, is unverified, has a
recorded discrepancy, or is demo content. It doesn't stop you saving; it reminds you what a reviewer will check.

**Broken links:** administrators see a daily report under **Administration → Link checks** (links on services and
department pages). Fix a broken link in the item that uses it.

**The steps every item goes through:** *Draft* → *In review* → *Approved* → *Scheduled* or *Published* → *Archived*.
You change the step with **Workflow status** in the right-hand column. If a step isn't allowed for your role, you'll see
a message explaining why — nothing is changed. "Verification" (right column) is separate: it says whether facts were
checked against an official source.

## 1. Holiday notice (contributor → reviewer → publisher)
1. **Notices → Create new.** Title: e.g. "Thanksgiving trash collection change". Kind: *Holiday / schedule change*.
2. Summary: one or two plain sentences. Body: details. Department: yours.
3. *Starts at / Ends at*: when the change applies. Only post a change Public Works has confirmed — never assume from a calendar.
4. Save (Draft). Set Workflow status to **In review**, save. Your reviewer sets **Approved**.
5. The publisher sets **Scheduled** with *Publish at* (e.g. Monday 8:00 a.m.) and *Expires at* (after the holiday). The
   system publishes and removes it automatically; subscribers receive one email.
6. Mistake after publishing? A publisher edits it, or opens **Versions** and restores the previous version.

## 2. Meeting agenda (records clerk)
1. **Meetings → Create new.** Title, Body, Type, Starts at (date + time), Location, Public participation instructions.
2. **Agenda items → Add**: number, title, short description. Link legislation in *Legislation* (create the ordinance first
   under **Legislation** with its exact official number).
3. Publish when the agenda is final. After the meeting: add **Minutes** versions (draft → approved), record **Votes**
   (each member's vote, result as recorded), and add actions to each item of legislation (introduced, tabled, adopted…).
   Status is calculated from those actions — you never set "Adopted" by hand.
4. Paste legal text into *Text versions*; tick "Reviewed against original" only after checking the signed copy.

## 3. Project milestone (data manager; updates by department contributors)
1. **Projects** → open the project → *Milestones → Add*: kind (approval, funding, scheduled, construction start,
   substantial completion, closeout), planned date and/or actual date, evidence link.
2. Keep approval, funding and construction as separate rows — they are different facts.
3. Contributors post resident-facing news under **Project updates** (goes through review). Subscribers to that project
   get an email when it is published.

## 4. Budget import (data manager)
1. **Budget datasets → Create**: title, fiscal year, basis (adopted/amended/actual), type, units, source description,
   data updated date. Keep it in Draft.
2. **Source records → Create** for the file (where it came from, date).
3. **Import batches → Create**: upload the CSV, pick the dataset and source, check the column mapping (left = platform
   field, right = your column heading). Required columns: Fund, Category, Description, Amount.
4. Set *Requested action* = **Run dry run**, save. Within a minute *Status* shows **validated** or **invalid**; the
   *Report* lists row numbers and problems (bad amounts, unknown categories, duplicates). Fix the file and upload a new batch.
5. Set *Requested action* = **Commit**. Rows are added in one transaction. Wrong file? **Roll back committed rows**.
6. Send the dataset through review and publication. Empty amounts mean "not available" — never type 0 unless it is zero.

## 5. Replace a seasonal image
1. **Media → Create**: upload a JPG/PNG/WebP. Fill alt text (what it shows), credit, rights holder, license, location in
   Orange, tick *Location verified* only if confirmed. Drag the focal point to the subject.
2. A publisher sets *Approval status* = approved.
3. **Seasonal features** → open the feature → choose the new image → submit for review. Unapproved or unverified images
   are never shown; the standard panel is used instead.
