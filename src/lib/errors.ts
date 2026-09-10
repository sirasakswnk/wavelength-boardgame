export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/permission.denied/i.test(message)) return 'ไม่มีสิทธิ์ทำรายการนี้ หรือสถานะห้องเปลี่ยนแล้ว กรุณาลองใหม่'
  if (/network|disconnected|unavailable/i.test(message)) return 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'
  return message
}
