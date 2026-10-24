import type { TaskContextBriefing } from '../../../types';

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting execCommand fallback', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

export function formatTaskBriefingMarkdown(briefing: TaskContextBriefing): string {
  const { task } = briefing;
  const lines: string[] = [];

  lines.push(`# [${task.ticket_key}] ${task.title}`);
  lines.push('');
  lines.push(`- **Kind:** ${task.kind}`);
  lines.push(`- **Priority:** P${task.priority}`);
  lines.push(`- **Status:** ${task.status}`);
  lines.push(`- **Repo:** ${task.scope.repo || 'n/a'}`);
  lines.push(`- **Crate:** ${task.scope.crate_name || 'n/a'}`);
  if (task.scope.module_path) {
    lines.push(`- **Module:** \`${task.scope.module_path}\``);
  }
  if (task.scope.target_files && task.scope.target_files.length > 0) {
    lines.push('- **Target Files:**');
    task.scope.target_files.forEach((f) => lines.push(`  - \`${f}\``));
  }
  if (task.scope.target_symbols && task.scope.target_symbols.length > 0) {
    lines.push('- **Target Symbols:**');
    task.scope.target_symbols.forEach((s) => lines.push(`  - \`${s}\``));
  }
  if (task.scope.labels && task.scope.labels.length > 0) {
    lines.push(`- **Labels:** ${task.scope.labels.map((l) => `\`${l}\``).join(', ')}`);
  }

  lines.push('');
  lines.push('## Description');
  lines.push(task.description || '_No description provided._');

  if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
    lines.push('');
    lines.push('## Acceptance Criteria');
    task.acceptance_criteria.forEach((crit) => lines.push(`- [ ] ${crit}`));
  }

  if (task.plan) {
    lines.push('');
    lines.push('## Execution Plan');
    lines.push(task.plan.summary);
    if (task.plan.steps && task.plan.steps.length > 0) {
      lines.push('');
      lines.push('### Steps');
      task.plan.steps.forEach((s) => {
        lines.push(`- [${s.completed ? 'x' : ' '}] **${s.step_id}**: ${s.title}`);
        if (s.verification_gate) {
          lines.push(`  - *Gate:* \`${s.verification_gate}\``);
        }
      });
    }
    if (task.plan.design_markdown) {
      lines.push('');
      lines.push('### Design Markdown');
      lines.push(task.plan.design_markdown);
    }
  }

  if (briefing.verification_command) {
    lines.push('');
    lines.push('## Verification');
    lines.push(`\`\`\`bash\n${briefing.verification_command}\n\`\`\``);
  }

  return lines.join('\n');
}
