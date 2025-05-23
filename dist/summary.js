"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummary = void 0;
const slugify_1 = __importDefault(require("@sindresorhus/slugify"));
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const prettier_1 = require("prettier");
const calculate_response_time_1 = require("./helpers/calculate-response-time");
const calculate_uptime_1 = require("./helpers/calculate-uptime");
const config_1 = require("./helpers/config");
const git_1 = require("./helpers/git");
const github_1 = require("./helpers/github");
const init_check_1 = require("./helpers/init-check");
const url_1 = require("url");
const secrets_1 = require("./helpers/secrets");
const generateSummary = async () => {
    if (!(await (0, init_check_1.shouldContinue)()))
        return;
    await (0, fs_extra_1.mkdirp)("history");
    const [owner, repo] = (0, secrets_1.getOwnerRepo)();
    const config = await (0, config_1.getConfig)();
    const octokit = await (0, github_1.getOctokit)();
    let readmeContent = await (0, fs_extra_1.readFile)((0, path_1.join)(".", "README.md"), "utf8");
    const startText = readmeContent.split(config.summaryStartHtmlComment || "<!--start: status pages-->")[0];
    const endText = readmeContent.split(config.summaryEndHtmlComment || "<!--end: status pages-->")[1];
    // This object will track the summary data of all sites
    const pageStatuses = [];
    // We'll keep incrementing this if there are down/degraded sites
    // This is used to show the overall status later
    let numberOfDown = 0;
    let numberOfDegraded = 0;
    // Loop through each site and add compute the current status
    for await (const site of config.sites) {
        const slug = site.slug || (0, slugify_1.default)(site.name);
        const uptimes = await (0, calculate_uptime_1.getUptimePercentForSite)(slug);
        console.log("Uptimes", uptimes);
        const responseTimes = await (0, calculate_response_time_1.getResponseTimeForSite)(slug);
        console.log("Response times", responseTimes);
        let fallbackIcon = "";
        try {
            fallbackIcon = `https://icons.duckduckgo.com/ip3/${(0, url_1.parse)(site.url).hostname}.ico`;
        }
        catch (error) { }
        pageStatuses.push({
            name: site.name,
            url: site.url,
            icon: site.icon || fallbackIcon,
            slug,
            status: responseTimes.currentStatus,
            uptime: uptimes.all,
            uptimeDay: uptimes.day,
            uptimeWeek: uptimes.week,
            uptimeMonth: uptimes.month,
            uptimeYear: uptimes.year,
            time: Math.floor(responseTimes.all),
            timeDay: responseTimes.day,
            timeWeek: responseTimes.week,
            timeMonth: responseTimes.month,
            timeYear: responseTimes.year,
            dailyMinutesDown: uptimes.dailyMinutesDown,
        });
        if (responseTimes.currentStatus === "down")
            numberOfDown++;
        if (responseTimes.currentStatus === "degraded")
            numberOfDegraded++;
    }
    let website = `https://${config.owner}.github.io/${config.repo}`;
    if (config["status-website"] && config["status-website"].cname)
        website = `https://${config["status-website"].cname}`;
    const i18n = config.i18n || {};
    if (readmeContent.includes(config.summaryStartHtmlComment || "<!--start: status pages-->")) {
        readmeContent = `${startText}${config.summaryStartHtmlComment || "<!--start: status pages-->"}
<!-- This summary is generated by Upptime (https://github.com/upptime/upptime) -->
<!-- Do not edit this manually, your changes will be overwritten -->
<!-- prettier-ignore -->
| ${i18n.url || "URL"} | ${i18n.status || "Status"} | ${i18n.history || "History"} | ${i18n.responseTime || "Response Time"} | ${i18n.uptime || "Uptime"} |
| --- | ------ | ------- | ------------- | ------ |
${pageStatuses
            .map((page) => `| <img alt="" src="${page.icon}" height="13"> ${page.url.includes("$") ? page.name : `[${page.name}](${page.url})`} | ${page.status === "up"
            ? i18n.up || "🟩 Up"
            : page.status === "degraded"
                ? i18n.degraded || "🟨 Degraded"
                : i18n.down || "🟥 Down"} | [${page.slug}.yml](https://github.com/${owner}/${repo}/commits/HEAD/history/${page.slug}.yml) | <details><summary><img alt="${i18n.responseTimeGraphAlt || "Response time graph"}" src="./graphs/${page.slug}/response-time-week.png" height="20"> ${page.timeWeek}${i18n.ms || "ms"}</summary><br><a href="${website}/history/${page.slug}"><img alt="${i18n.responseTime || "Response time"} ${page.time}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fresponse-time.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.responseTimeDay || "24-hour response time"} ${page.timeDay}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fresponse-time-day.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.responseTimeWeek || "7-day response time"} ${page.timeWeek}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fresponse-time-week.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.responseTimeMonth || "30-day response time"} ${page.timeMonth}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fresponse-time-month.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.responseTimeYear || "1-year response time"} ${page.timeYear}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fresponse-time-year.json"></a></details> | <details><summary><a href="${website}/history/${page.slug}">${page.uptimeWeek}</a></summary><a href="${website}/history/${page.slug}"><img alt="${i18n.uptime || "All-time uptime"} ${page.uptime}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fuptime.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.uptimeDay || "24-hour uptime"} ${page.uptimeDay}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fuptime-day.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.uptimeWeek || "7-day uptime"} ${page.uptimeWeek}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fuptime-week.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.uptimeMonth || "30-day uptime"} ${page.uptimeMonth}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fuptime-month.json"></a><br><a href="${website}/history/${page.slug}"><img alt="${i18n.uptimeYear || "1-year uptime"} ${page.uptimeYear}" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2F${owner}%2F${repo}%2FHEAD%2Fapi%2F${page.slug}%2Fuptime-year.json"></a></details>`)
            .join("\n")}
${config.summaryEndHtmlComment || "<!--end: status pages-->"}${endText}`;
    }
    // Skip running this in the template repository
    if (`${owner}/${repo}` !== "upptime/upptime") {
        // Remove Upptime logo and add heaading
        readmeContent = readmeContent
            .split("\n")
            .map((line, index) => {
            if (index === 0 && line.includes("https://upptime.js.org"))
                return `# [📈 ${i18n.liveStatus || "Live Status"}](${website}): ${i18n.liveStatusHtmlComment || "<!--live status-->"} **${i18n.allSystemsOperational || "🟩 All systems operational"}**`;
            if (line.includes("[![Summary CI](https://github.com") &&
                readmeContent.includes("<!--start: description-->"))
                return `${line}\n\nWith [Upptime](https://upptime.js.org), you can get your own unlimited and free uptime monitor and status page, powered entirely by a GitHub repository. We use [Issues](https://github.com/${config.owner}/${config.repo}/issues) as incident reports, [Actions](https://github.com/${config.owner}/${config.repo}/actions) as uptime monitors, and [Pages](${website}) for the status page.`;
            return line;
        })
            .filter((line) => !line.startsWith(`## [📈 ${i18n.liveStatus || "Live Status"}]`))
            .join("\n");
        // Remove default documentation
        const docsStartText = readmeContent.split("<!--start: docs-->")[0];
        const docsEndText = readmeContent.split("<!--end: docs-->")[1];
        if (readmeContent.includes("<!--start: docs-->"))
            readmeContent = `${docsStartText}[**Visit our status website →**](${website})${docsEndText}`;
        // Remove Koj logo
        const logoStartText = readmeContent.split("<!--start: logo-->")[0];
        const logoEndText = readmeContent.split("<!--end: logo-->")[1];
        if (readmeContent.includes("<!--start: logo-->"))
            readmeContent = `${logoStartText}${logoEndText}`;
        let name = `[${config.owner}](${website})`;
        if (readmeContent.includes("[MIT](./LICENSE) © [Koj](https://koj.co)") ||
            readmeContent.includes("<!--start: description-->")) {
            try {
                const org = await octokit.users.getByUsername({
                    username: config.owner,
                });
                name = `[${org.data.name || config.owner}](${org.data.blog || website})`;
            }
            catch (error) { }
            // Remove Koj description
            const descriptionStartText = readmeContent.split("<!--start: description-->")[0];
            const descriptionEndText = readmeContent.split("<!--end: description-->")[1];
            if (readmeContent.includes("<!--start: description-->"))
                readmeContent = `${descriptionStartText}This repository contains the open-source uptime monitor and status page for ${name}, powered by [Upptime](https://github.com/upptime/upptime).${descriptionEndText}`;
            // Change copyright
            readmeContent = readmeContent.replace("[MIT](./LICENSE) © [Koj](https://koj.co)", `[MIT](./LICENSE) © ${name}`);
            // Add powered by Upptime
            if (!config.skipPoweredByReadme) {
                readmeContent = readmeContent.replace("## 📄 License\n\n- Code: [MIT](./LICENSE)", "## 📄 License\n\n- Powered by: [Upptime](https://github.com/upptime/upptime)\n- Code: [MIT](./LICENSE)");
            }
        }
        // Change badges
        readmeContent = readmeContent.replace(new RegExp("upptime/upptime/(workflows|actions)", "g"), `${config.owner}/${config.repo}/$1`);
        // Add repo description, topics, etc.
        try {
            const repoInfo = await octokit.repos.get({ owner, repo });
            if (!repoInfo.data.description && !config.skipDescriptionUpdate)
                await octokit.repos.update({
                    owner,
                    repo,
                    description: `📈 Uptime monitor and status page for ${name
                        .split("]")[0]
                        .replace("[", "")}, powered by @upptime`,
                });
            console.log("Current topics are", repoInfo.data.topics);
            if (!(repoInfo.data.topics || []).includes("upptime") &&
                !config.skipTopicsUpdate)
                await octokit.repos.replaceAllTopics({
                    owner,
                    repo,
                    names: [
                        ...(repoInfo.data.topics || []),
                        "uptime-monitor",
                        "status-page",
                        "upptime",
                    ].filter((value, index, array) => array.indexOf(value) === index),
                });
            console.log("Possibly updated to to", [
                ...(repoInfo.data.topics || []),
                "uptime-monitor",
                "status-page",
                "upptime",
            ].filter((value, index, array) => array.indexOf(value) === index));
            console.log("Topics are", (await octokit.repos.get({ owner, repo })).data.topics);
            if (!repoInfo.data.homepage && !config.skipHomepageUpdate)
                await octokit.repos.update({
                    owner,
                    repo,
                    homepage: website,
                });
        }
        catch (error) {
            console.log(error);
        }
    }
    // Add live status line
    readmeContent = readmeContent
        .split("\n")
        .map((line) => {
        if (line.includes("<!--live status-->")) {
            line = `${line.split("<!--live status-->")[0]}<!--live status--> **${numberOfDown === 0
                ? numberOfDegraded === 0
                    ? i18n.allSystemsOperational || "🟩 All systems operational"
                    : i18n.degradedPerformance || "🟨 Degraded performance"
                : numberOfDown === config.sites.length
                    ? i18n.completeOutage || "🟥 Complete outage"
                    : i18n.partialOutage || "🟧 Partial outage"}**`;
        }
        return line;
    })
        .join("\n");
    (0, git_1.pull)();
    await (0, fs_extra_1.writeFile)((0, path_1.join)(".", "README.md"), (0, prettier_1.format)(readmeContent, { parser: "markdown" }));
    await (0, fs_extra_1.writeFile)((0, path_1.join)(".", ".gitattributes"), "# Markdown\n*.md linguist-detectable=true\n*.md linguist-documentation=false\n\n# JSON\n*.json linguist-detectable=true\n\n# YAML\n*.yml linguist-detectable=true\n");
    (0, git_1.commit)((config.commitMessages || {}).readmeContent ||
        ":pencil: Update summary in README [skip ci] [upptime]", (config.commitMessages || {}).commitAuthorName, (config.commitMessages || {}).commitAuthorEmail);
    // If there are any old workflows left, fix them
    const workflows = (await (0, fs_extra_1.readdir)((0, path_1.join)(".", ".github", "workflows"))).filter((i) => i.endsWith(".yml"));
    for await (const workflow of workflows) {
        const content = await (0, fs_extra_1.readFile)((0, path_1.join)(".", ".github", "workflows", workflow), "utf8");
        const newContent = content.replace("actions/setup-node@v2.1.1", "actions/setup-node@v1.4.4");
        if (content !== newContent) {
            console.log("Updating workflow", workflow);
            await (0, fs_extra_1.writeFile)((0, path_1.join)(".", ".github", "workflows", workflow), newContent);
        }
    }
    await (0, fs_extra_1.writeFile)((0, path_1.join)(".", "history", "summary.json"), JSON.stringify(pageStatuses, null, 2));
    (0, git_1.commit)((config.commitMessages || {}).summaryJson ||
        ":card_file_box: Update status summary [skip ci] [upptime]", (config.commitMessages || {}).commitAuthorName, (config.commitMessages || {}).commitAuthorEmail);
    (0, git_1.push)();
    if (!config.skipDeleteIssues) {
        // Find all the opened issues that shouldn't have opened
        // Say, Upptime found a down monitor and it was back up within 5 min
        const issuesRecentlyClosed = await octokit.issues.listForRepo({
            owner,
            repo,
            state: "closed",
            labels: "status",
            per_page: 10,
        });
        console.log("Found recently closed issues", issuesRecentlyClosed.data.length);
        for await (const issue of issuesRecentlyClosed.data) {
            if (issue.closed_at &&
                // If this issue was closed within 15 minutes
                new Date(issue.closed_at).getTime() -
                    new Date(issue.created_at).getTime() <
                    900000 &&
                // It has 1 comment (the default Upptime one)
                issue.comments === 1) {
                try {
                    console.log("Trying to delete issue", issue.number, issue.node_id);
                    const result = await octokit.graphql(`
      mutation deleteIssue {
        deleteIssue(input:{issueId:"${issue.node_id}"}) {
          clientMutationId
        }
      }`);
                    console.log("Success", result);
                }
                catch (error) {
                    console.log("Error deleting this issue", error);
                }
            }
        }
    }
};
exports.generateSummary = generateSummary;
//# sourceMappingURL=summary.js.map