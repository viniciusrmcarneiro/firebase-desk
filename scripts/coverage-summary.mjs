#!/usr/bin/env node
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoots = ['apps', 'packages'];
const metricNames = ['statements', 'branches', 'functions', 'lines'];

const summaries = workspaceRoots
  .flatMap((workspaceRoot) => findWorkspaceSummaries(join(rootDir, workspaceRoot)))
  .sort((left, right) => left.workspace.localeCompare(right.workspace));

const markdown = summaries.length > 0 ? renderCoverageSummary(summaries) : renderEmptySummary();

console.log(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

function findWorkspaceSummaries(workspaceRoot) {
  if (!existsSync(workspaceRoot)) return [];
  return readdirSync(workspaceRoot)
    .map((workspaceName) => join(workspaceRoot, workspaceName))
    .filter((workspaceDir) => statSync(workspaceDir).isDirectory())
    .map((workspaceDir) => readWorkspaceSummary(workspaceDir))
    .filter(Boolean);
}

function readWorkspaceSummary(workspaceDir) {
  const summaryPath = join(workspaceDir, 'coverage', 'coverage-summary.json');
  if (!existsSync(summaryPath)) return null;
  const packagePath = join(workspaceDir, 'package.json');
  const packageJson = existsSync(packagePath)
    ? JSON.parse(readFileSync(packagePath, 'utf8'))
    : { name: relative(rootDir, workspaceDir) };
  const coverageSummary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  return {
    workspace: packageJson.name,
    total: coverageSummary.total,
  };
}

function renderCoverageSummary(items) {
  const totals = aggregate(items.map((item) => item.total));
  const rows = [
    '| Workspace | Statements | Branches | Functions | Lines |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| **Total** | ${metricCell(totals.statements)} | ${metricCell(totals.branches)} | ${
      metricCell(totals.functions)
    } | ${metricCell(totals.lines)} |`,
    ...items.map((item) =>
      `| ${item.workspace} | ${metricCell(item.total.statements)} | ${
        metricCell(item.total.branches)
      } | ${metricCell(item.total.functions)} | ${metricCell(item.total.lines)} |`
    ),
  ];

  return [
    '## Unit Test Coverage',
    '',
    `Generated from ${items.length} Vitest coverage report${items.length === 1 ? '' : 's'}.`,
    '',
    ...rows,
  ].join('\n');
}

function renderEmptySummary() {
  return [
    '## Unit Test Coverage',
    '',
    'No Vitest coverage reports were found.',
  ].join('\n');
}

function aggregate(totals) {
  return Object.fromEntries(
    metricNames.map((metricName) => [
      metricName,
      totals.reduce(
        (sum, total) => ({
          covered: sum.covered + total[metricName].covered,
          total: sum.total + total[metricName].total,
        }),
        { covered: 0, total: 0 },
      ),
    ]),
  );
}

function metricCell(metric) {
  if (metric.total === 0) return 'n/a';
  return `${formatPercent(metric.covered, metric.total)} (${metric.covered}/${metric.total})`;
}

function formatPercent(covered, total) {
  return `${((covered / total) * 100).toFixed(2)}%`;
}
