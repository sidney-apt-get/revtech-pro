import { supabase } from './supabase'

export async function sendTelegramNotification(message: string): Promise<void> {
  if (localStorage.getItem('revtech_telegram_enabled') === '0') return
  try {
    await supabase.functions.invoke('telegram-notify', { body: { message } })
  } catch (err) {
    console.error('Telegram notification failed:', err)
  }
}
