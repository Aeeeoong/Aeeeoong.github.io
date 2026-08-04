import './dayjsConfig.js'
import koKRImport from 'antd/locale/ko_KR'

function unwrapAntdLocale(mod) {
  if (mod?.DatePicker) return mod
  if (mod?.default?.DatePicker) return mod.default
  return mod
}

const koKR = unwrapAntdLocale(koKRImport)

/** rc-picker는 일~토 순 배열을 weekFirstDay(월=1)만큼 회전해 표시함 */
const shortWeekDaysSunFirst = ['일', '월', '화', '수', '목', '금', '토']

const basePickerLocale = koKR.DatePicker || {}
const datePickerLocale = {
  ...basePickerLocale,
  lang: {
    ...(basePickerLocale.lang || {}),
    shortWeekDays: shortWeekDaysSunFirst,
  },
}

/** antd 전역 로케일 — 주 시작: 월요일 (dayjs weekStart: 1) */
const antdLocale = {
  ...koKR,
  DatePicker: datePickerLocale,
  Calendar: datePickerLocale,
}

export default antdLocale
export { datePickerLocale }
