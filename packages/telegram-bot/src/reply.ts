import type { InlineKeyboard } from 'grammy';
import { GrammyError } from 'grammy';
import type { BotContext } from './session.js';

/**
 * Show a screen. When the update came from an inline button we edit the
 * existing message so the chat does not fill up; otherwise we send a new one.
 */
export async function showScreen(ctx: BotContext, text: string, keyboard?: InlineKeyboard) {
  const options = {
    parse_mode: 'HTML' as const,
    reply_markup: keyboard,
    link_preview_options: { is_disabled: true },
  };

  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch (error) {
      if (isNotModified(error)) return;
      if (!isEditFailure(error)) throw error;
      // Message is too old or was deleted: fall back to a new message.
    }
  }
  await ctx.reply(text, options);
}

export async function acknowledge(ctx: BotContext, text?: string) {
  if (!ctx.callbackQuery) return;
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined);
  } catch {
    // Query may already be expired; nothing to do.
  }
}

function isNotModified(error: unknown): boolean {
  return error instanceof GrammyError && error.description.includes('message is not modified');
}

function isEditFailure(error: unknown): boolean {
  return error instanceof GrammyError && error.error_code === 400;
}
