import { formatDoseLine } from '@growlog/web-lib/nutrient/workspace/mobile-result';
import type { GuestRecipe } from '@growlog/domain';
import type { SolveForwardResult } from '@growlog/nutrient-calc';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recipeHtml(recipe: GuestRecipe): string {
  const solver = recipe.inputs._solverResult as SolveForwardResult | undefined;
  const doses = solver?.doses?.filter((d) => d.amountPerL > 0) ?? [];
  const doseLines = doses.map((d) => escapeHtml(formatDoseLine(d))).join('<br/>');
  return `
    <section style="margin-bottom:24px; page-break-inside:avoid;">
      <h2 style="color:#1b4332;margin:0 0 8px;">${escapeHtml(recipe.name)}</h2>
      <p style="margin:0 0 8px;color:#52796f;">Volume: ${recipe.volume_l} L · ${escapeHtml(recipe.solution_kind)}</p>
      ${doseLines ? `<div style="font-size:14px;line-height:1.5;">${doseLines}</div>` : '<p>No doses recorded.</p>'}
    </section>
  `;
}

export async function shareOwnRecipesPdf(recipes: GuestRecipe[]): Promise<'empty' | 'shared'> {
  if (!recipes.length) return 'empty';

  const body = recipes.map(recipeHtml).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Growlog recipes</title></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#1b4332;">
  <h1 style="font-size:22px;">My nutrient recipes</h1>
  <p style="color:#52796f;font-size:13px;">Saved from Growlog on ${new Date().toLocaleDateString()}. For your records only.</p>
  ${body}
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save recipes PDF',
      UTI: 'com.adobe.pdf',
    });
  }
  return 'shared';
}
