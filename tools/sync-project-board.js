import fetch from "node-fetch";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}

const QUERY = `
query {
  user(login: "jkellyllekj") {
    projectV2(number: 1) {
      title
      fields(first: 50) {
        nodes {
          __typename
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
          ... on ProjectV2Field {
            id
            name
          }
        }
      }
    }
  }
}
`;

async function run() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: QUERY })
  });

  const json = await res.json();

  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const project = json.data.user.projectV2;

  console.log("Project title:");
  console.log(project.title);
  console.log("");

  console.log("Fields:");
  for (const field of project.fields.nodes) {
    if (field.__typename === "ProjectV2SingleSelectField") {
      console.log(`- ${field.name} (single select)`);
      for (const opt of field.options) {
        console.log(`    * ${opt.name}`);
      }
    } else {
      console.log(`- ${field.name}`);
    }
  }
}

run();
