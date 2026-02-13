import fetch from "node-fetch";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}

const OWNER = "jkellyllekj";
const REPO = "swimgen2";
const PROJECT_NUMBER = 1;

async function graphql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    throw new Error("GraphQL request failed");
  }
  return json.data;
}

function parseProjectState(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const tasks = [];

  const bugSection = content.match(
    /={3,}\nKNOWN BUGS & LIMITATIONS.*?\n={3,}\n([\s\S]*?)(?=\n={3,})/
  );
  if (bugSection) {
    const lines = bugSection[1].split("\n");
    for (const line of lines) {
      const fixed = line.match(/^\s*-\s*✅\s*FIXED:\s*(.+)/);
      if (fixed) {
        tasks.push({ title: `BUG: ${fixed[1].trim()}`, status: "Done" });
        continue;
      }
      const inProg = line.match(/^\s*-\s*🔄\s*IN PROGRESS:\s*(.+)/);
      if (inProg) {
        tasks.push({ title: `BUG: ${inProg[1].trim()}`, status: "In Progress" });
        continue;
      }
      const pending = line.match(/^\s*-\s*⏳\s*PENDING:\s*(.+)/);
      if (pending) {
        tasks.push({ title: `BUG: ${pending[1].trim()}`, status: "Todo" });
        continue;
      }
    }
  }

  const strategySection = content.match(
    /={3,}\nREBUILD & FEATURE STRATEGY.*?\n={3,}\n([\s\S]*?)(?=\n={3,})/
  );
  if (strategySection) {
    const lines = strategySection[1].split("\n");
    for (const line of lines) {
      const completed = line.match(
        /^\s*\d+\.\s*✅\s*COMPLETED:\s*\*\*(.+?)\*\*/
      );
      if (completed) {
        tasks.push({ title: completed[1].trim(), status: "Done" });
        continue;
      }
      const pendingFeat = line.match(
        /^\s*\d+\.\s*⏳\s*PENDING:\s*\*\*(.+?)\*\*/
      );
      if (pendingFeat) {
        tasks.push({ title: pendingFeat[1].trim(), status: "Todo" });
        continue;
      }
      const inProgFeat = line.match(
        /^\s*\d+\.\s*🔄\s*IN PROGRESS:\s*\*\*(.+?)\*\*/
      );
      if (inProgFeat) {
        tasks.push({ title: inProgFeat[1].trim(), status: "In Progress" });
        continue;
      }
    }
  }

  const phaseItems = content.match(
    /\*\*PHASE \d+:.*?\*\*\n([\s\S]*?)(?=\*\*PHASE|\n={3,})/g
  );
  if (phaseItems) {
    for (const block of phaseItems) {
      const phaseTitle = block.match(/\*\*PHASE \d+:\s*(.+?)\*\*/);
      const phaseName = phaseTitle ? phaseTitle[1].trim() : "";
      const lines = block.split("\n");
      let lastPhaseNum = "";
      for (const line of lines) {
        const phaseMatch = line.match(/\*\*PHASE (\d+)/);
        if (phaseMatch) lastPhaseNum = phaseMatch[1];
      }
    }
  }

  const majorSection = content.match(
    /\*\*MAJOR ISSUES:\*\*\n([\s\S]*?)(?=\n\*\*|={3,})/
  );
  if (majorSection) {
    const lines = majorSection[1].split("\n");
    for (const line of lines) {
      const item = line.match(/^\s*-\s+(.+)/);
      if (item && !item[1].startsWith("✅")) {
        tasks.push({ title: `BUG: ${item[1].trim()}`, status: "Todo" });
      }
    }
  }

  const uiSection = content.match(
    /\*\*UI\/DESIGN ISSUES:\*\*\n([\s\S]*?)(?=\n\*\*|={3,})/
  );
  if (uiSection) {
    const lines = uiSection[1].split("\n");
    for (const line of lines) {
      const item = line.match(/^\s*-\s+(.+)/);
      if (item && !item[1].startsWith("✅")) {
        tasks.push({ title: `UI: ${item[1].trim()}`, status: "Todo" });
      }
    }
  }

  const commentsSection = content.match(
    /={3,}\nCOMMENTS & FEEDBACK.*?\n={3,}\n([\s\S]*?)(?=\n={3,})/
  );
  if (commentsSection) {
    const lines = commentsSection[1].split("\n");
    for (const line of lines) {
      const item = line.match(/^\s*-\s+\[.*?\]\s+(.+)/);
      if (item) {
        tasks.push({
          title: `FEEDBACK: ${item[1].trim()}`,
          status: "Comments & Feedback",
        });
      }
    }
  }

  const ideaSection = content.match(
    /={3,}\nIDEA PARKING LOT.*?\n={3,}\n([\s\S]*?)(?=\n={3,})/
  );
  if (ideaSection) {
    const text = ideaSection[1];
    const groups = text.split(/\n(?=[A-Z][A-Za-z].*:)\n?/);
    for (const group of groups) {
      const lines = group.trim().split("\n");
      if (!lines[0]) continue;
      const heading = lines[0].replace(/:$/, "").trim();
      if (
        heading.startsWith("Rule") ||
        heading.startsWith("Items below") ||
        heading.startsWith("If an idea")
      )
        continue;
      if (heading.length < 3) continue;
      const bullets = lines
        .slice(1)
        .filter((l) => l.match(/^\s*-\s+/))
        .map((l) => l.replace(/^\s*-\s+/, "").trim());
      if (bullets.length > 0) {
        tasks.push({
          title: `IDEA: ${heading}`,
          status: "Idea parking",
          body: bullets.map((b) => `- ${b}`).join("\n"),
        });
      }
    }
  }

  const seen = new Set();
  return tasks.filter((t) => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  });
}

async function getProjectInfo() {
  const data = await graphql(`
    query {
      user(login: "${OWNER}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          title
          fields(first: 50) {
            nodes {
              __typename
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
              ... on ProjectV2Field {
                id
                name
              }
            }
          }
        }
      }
      repository(owner: "${OWNER}", name: "${REPO}") {
        id
      }
    }
  `);
  return {
    project: data.user.projectV2,
    repoId: data.repository.id,
  };
}

async function findExistingIssues() {
  const issues = [];
  let cursor = null;
  let hasMore = true;
  while (hasMore) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const data = await graphql(`
      query {
        repository(owner: "${OWNER}", name: "${REPO}") {
          issues(first: 100, states: [OPEN, CLOSED]${afterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              title
              number
              state
              body
            }
          }
        }
      }
    `);
    const page = data.repository.issues;
    issues.push(...page.nodes);
    hasMore = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
  }
  return issues;
}

async function createIssue(repoId, title, body) {
  const data = await graphql(
    `mutation($input: CreateIssueInput!) {
      createIssue(input: $input) {
        issue { id number title }
      }
    }`,
    { input: { repositoryId: repoId, title, body: body || "" } }
  );
  return data.createIssue.issue;
}

async function addToProject(projectId, issueId) {
  const data = await graphql(
    `mutation($input: AddProjectV2ItemByIdInput!) {
      addProjectV2ItemById(input: $input) {
        item { id }
      }
    }`,
    { input: { projectId, contentId: issueId } }
  );
  return data.addProjectV2ItemById.item.id;
}

async function setItemStatus(projectId, itemId, fieldId, optionId) {
  await graphql(
    `mutation($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item { id }
      }
    }`,
    {
      input: {
        projectId,
        itemId,
        fieldId,
        value: { singleSelectOptionId: optionId },
      },
    }
  );
}

async function findProjectItems(projectId) {
  const items = [];
  let cursor = null;
  let hasMore = true;
  while (hasMore) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const data = await graphql(`
      query {
        node(id: "${projectId}") {
          ... on ProjectV2 {
            items(first: 100${afterClause}) {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                content {
                  ... on Issue { id title number }
                }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      field { ... on ProjectV2SingleSelectField { name } }
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
    const page = data.node.items;
    items.push(...page.nodes);
    hasMore = page.pageInfo.hasNextPage;
    cursor = page.pageInfo.endCursor;
  }
  return items;
}

const SYNC_MARKER = "<!-- swimgen-sync -->";

async function run() {
  console.log("=== SwimSum Project Board Sync ===\n");

  const mdPath = resolve(__dirname, "..", "project-state.md");
  console.log("Parsing project-state.md...");
  const tasks = parseProjectState(mdPath);
  console.log(`Found ${tasks.length} tasks:\n`);
  for (const t of tasks) {
    console.log(`  [${t.status}] ${t.title}`);
  }
  console.log("");

  console.log("Fetching project info...");
  const { project, repoId } = await getProjectInfo();
  console.log(`Project: ${project.title}`);

  const statusField = project.fields.nodes.find(
    (f) => f.name === "Status" && f.__typename === "ProjectV2SingleSelectField"
  );
  if (!statusField) {
    console.error("Could not find Status field on project");
    process.exit(1);
  }

  const optionMap = {};
  for (const opt of statusField.options) {
    optionMap[opt.name] = opt.id;
  }
  console.log("Status options:", Object.keys(optionMap).join(", "));

  const neededStatuses = [...new Set(tasks.map((t) => t.status))];
  const missing = neededStatuses.filter((s) => !optionMap[s]);
  if (missing.length > 0) {
    console.log(`\nNote: Missing status options: ${missing.join(", ")}`);
    console.log(
      "Items with these statuses will be skipped. Add them to your project board settings and re-run to sync them."
    );
    console.log("");
  }

  console.log("\nFetching existing issues...");
  const existingIssues = await findExistingIssues();
  console.log(`Found ${existingIssues.length} existing issues`);

  console.log("Fetching existing project items...");
  const existingItems = await findProjectItems(project.id);
  console.log(`Found ${existingItems.length} items on board\n`);

  const issuesByTitle = {};
  for (const issue of existingIssues) {
    issuesByTitle[issue.title] = issue;
  }

  const itemsByIssueId = {};
  for (const item of existingItems) {
    if (item.content && item.content.id) {
      const currentStatus = item.fieldValues.nodes.find(
        (fv) => fv.field && fv.field.name === "Status"
      );
      itemsByIssueId[item.content.id] = {
        itemId: item.id,
        currentStatus: currentStatus ? currentStatus.name : null,
      };
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  let skippedMissing = 0;

  for (const task of tasks) {
    if (!optionMap[task.status]) {
      console.log(
        `  SKIP (no column): "${task.title}" -> ${task.status}`
      );
      skippedMissing++;
      continue;
    }

    const existing = issuesByTitle[task.title];
    const body = (task.body || "") + `\n\n${SYNC_MARKER}`;

    if (existing) {
      const projectItem = itemsByIssueId[existing.id];

      if (projectItem) {
        if (projectItem.currentStatus === task.status) {
          console.log(`  SKIP: "${task.title}" (already ${task.status})`);
          skipped++;
          continue;
        }
        console.log(
          `  MOVE: "${task.title}" ${projectItem.currentStatus} -> ${task.status}`
        );
        await setItemStatus(
          project.id,
          projectItem.itemId,
          statusField.id,
          optionMap[task.status]
        );
        updated++;
      } else {
        console.log(`  ADD TO BOARD: "${task.title}" -> ${task.status}`);
        const itemId = await addToProject(project.id, existing.id);
        await setItemStatus(
          project.id,
          itemId,
          statusField.id,
          optionMap[task.status]
        );
        updated++;
      }
    } else {
      console.log(`  CREATE: "${task.title}" -> ${task.status}`);
      const issue = await createIssue(repoId, task.title, body);
      const itemId = await addToProject(project.id, issue.id);
      await setItemStatus(
        project.id,
        itemId,
        statusField.id,
        optionMap[task.status]
      );
      created++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n=== Sync Complete ===");
  console.log(`Created: ${created}`);
  console.log(`Updated/Moved: ${updated}`);
  console.log(`Skipped (no change): ${skipped}`);
  if (skippedMissing > 0) {
    console.log(`Skipped (missing column): ${skippedMissing}`);
  }
  console.log(`Total tasks processed: ${tasks.length}`);
}

run().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
